// models/challanModel.js
const { pool } = require('../config/db');

const createChallanTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS challan_info (
      id SERIAL PRIMARY KEY,
      tchalanno BIGINT NOT NULL,
      book_id INTEGER NOT NULL,
      book_name_eng VARCHAR(255),
      medium_id INTEGER,
      class_id INTEGER,
      books INTEGER,
      cluster_name VARCHAR(255),
      clucd BIGINT,
      school VARCHAR(255),
      school_id BIGINT NOT NULL,
      Depot_ID INTEGER,
      DepotName_Eng VARCHAR(255),
      trans_type_index INT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (tchalanno, book_id, school_id)    );
  `;
  try {
    await pool.query(query);
    // console.log('Challan info table created or already exists.');
  } catch (err) {
    console.error('Error creating challan info table:', err);
  }
};

const insertChallanIfNotExists = async (challan) => {
  const {
    Tchalanno, BookId, BookName_Eng, MediumID, Classid,
    Books, CLUSTERNAME, CLUCD, SCHOOL, SCHOOLID, Depot_ID, DepotName_Eng, Trans_type_index
  } = challan;

  const query = `
    INSERT INTO challan_info (
      tchalanno, book_id, book_name_eng, medium_id, class_id, books, 
      cluster_name, clucd, school, school_id,Depot_ID,DepotName_Eng, trans_type_index
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (tchalanno, book_id, school_id) DO NOTHING
  `;

  const values = [
    Tchalanno, BookId, BookName_Eng, MediumID, Classid,
    Books, CLUSTERNAME, CLUCD, SCHOOL, SCHOOLID, Depot_ID, DepotName_Eng, Trans_type_index
  ];

  await pool.query(query, values);
};



async function migrateChallanData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(`SELECT * FROM challan_info`);
    let challanRes;
    for (const row of res.rows) {
      const {
        tchalanno, book_id, school_id, books,
        depot_id, book_name_eng, depotname_eng
      } = row;

      const fetchExisting = await client.query(`
          SELECT id FROM tbc_school_challans
          WHERE sender_id = $1 AND udise_code = $2 AND challan_number = $3
        `, [depot_id, school_id, tchalanno]);
    
      // 1. Insert or fetch challan from tbc_school_challans
      if (fetchExisting.rows.length > 0) {
        // console.log(`Challan already exists for school ${school_id} with challan number ${tchalanno}`);
        challanRes = fetchExisting.rows[0].id; // Use existing challan
        // console.log(`Using existing challan ID: ${challanRes}`);
       // Skip if challan already exists
      } else {
        challanRes = await client.query(`
        INSERT INTO tbc_school_challans (sender_id, udise_code, challan_date,challan_number)
        VALUES ($1, $2, CURRENT_DATE,$3)
        RETURNING id
      `, [depot_id, school_id, tchalanno]);
      }
      let challanId;

      if (challanRes?.rows?.length > 0) {
        challanId = challanRes.rows[0].id;
      } else {
        // Fetch the ID if it was not returned due to conflict

        const fetchRes = await client.query(`
          SELECT id FROM tbc_school_challans
          WHERE sender_id = $1 AND udise_code = $2 AND challan_date = CURRENT_DATE AND challan_number = $3
        `, [depot_id, school_id, tchalanno]);
        challanId = fetchRes.rows[0]?.id;
      }

      if (!challanId) {
        console.warn(`Skipping: Unable to resolve challan ID for school ${school_id}`);
        continue;
      }

      // 2. Insert into tbc_school_challan_books
      const bookId = await client.query(`
        SELECT tb.id FROM tbc_books tb  JOIN mst_subjects ms on ms.id=tb.subject_id  WHERE ms.book_id = $1
      `, [book_id]);
      await client.query(`
        INSERT INTO tbc_school_challan_books (challan_id, udise_code, book_id, quantity, remaining_qty)
  SELECT $1, $2, $3, $4, $5
  WHERE NOT EXISTS (
    SELECT 1 FROM tbc_school_challan_books
    WHERE challan_id = $1
      AND udise_code = $2
      AND book_id = $3
      AND quantity = $4
      AND remaining_qty = $5)
      `, [challanId, school_id, bookId?.rows[0]?.id, books, books]);
    }

    await client.query('COMMIT');
    console.log('✅ Data migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
  }
}
module.exports = {
  createChallanTable,
  insertChallanIfNotExists,
  migrateChallanData
};
// migrateChallanData();

