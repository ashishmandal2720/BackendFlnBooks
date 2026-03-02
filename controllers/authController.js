const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const responseHandler = require('../utils/responseHandler');
const roleMappings = {
  1: { table_name: null, column_name: null },
  2: { table_name: null, column_name: null },
  3: { table_name: 'mst_depot', column_name: 'depot_cd' },
  4: { table_name: 'mst_deo', column_name: 'district_cd' },
  5: { table_name: 'mst_beo', column_name: 'block_cd' },
  6: { table_name: 'mst_cac', column_name: 'cluster_cd' },
  7: { table_name: 'mst_schools', column_name: 'udise_sch_code' },
  8: { table_name: 'mst_teacher', column_name: 'teacher_code' },
  9: { table_name: 'mst_programmers', column_name: 'district_cd' },
  10: { table_name: 'mst_udise_teacher', column_name: 'nat_tch_id' },
  11: { table_name: null, column_name: null },
  12: { table_name: 'mst_join_directors', column_name: 'division_id' },
  // 8: { table_name: 'mst_schools', column_name: 'udise_sch_code' },
};

const getDataRoleUser = async (role_id,emp_code,contact)=>{
  const role = parseInt(role_id);
  if(role === 1 || role === 2 || role === 11) {
       return { name: 'Admin User', designation: 'System Role', emp_code: '' };
    }
    else if(role === 3) {
      const depot = await pool.query(`SELECT md.depot_name as designation, md.depot_manager as name, md.depot_cd as emp_code,md.depot_cd as unique_key FROM mst_depot md WHERE md.depot_cd = $1`, [emp_code]);
      return depot.rows[0];
    }
    else if(role === 4) {
      const depot = await pool.query(`SELECT md.district_name as designation, md.deo_name as name, md.district_cd as emp_code,md.district_cd as unique_key FROM mst_deo md WHERE md.district_cd = $1 AND md.mobile=$2`, [emp_code,contact]);
      return depot.rows[0];
    }
    else if(role === 5) {
      const depot = await pool.query(`SELECT md.block_name as designation, md.beo_name as name, md.block_cd as emp_code,md.block_cd as unique_key FROM mst_beo md WHERE md.block_cd = $1 AND md.mobile=$2`, [emp_code,contact]);
      return depot.rows[0];
    }
    else if(role === 9) {
      const depot = await pool.query(`SELECT md.district_name as designation, md.programmer_name as name, md.district_cd as emp_code,md.district_cd as unique_key FROM mst_programmers md WHERE md.district_cd = $1 AND md.mobile=$2`, [emp_code,contact]);
      return depot.rows[0];
    }
     else if(role === 6) {
      // SELECT *  FROM mst_teacher WHERE teacher_code = $1
      const depot = await pool.query(`SELECT mt.name_eng as name, mt.designation_name_eng as designation, mt.teacher_code as emp_code, mc.cluster_cd as unique_key
FROM
    mst_teacher mt
INNER JOIN
    mst_cac mc ON mt.mobile_no::TEXT = mc.cac_mobile
WHERE
    mt.teacher_code = $1
    AND mt.mobile_no = $2;`, [emp_code,contact]);
      return depot.rows[0];
    }
    else if(role === 7) {
      // SELECT *  FROM mst_teacher WHERE teacher_code = $1
      const depot = await pool.query(`SELECT mt.school_name as name,mt.sch_mgmt_id as designation,mt.udise_sch_code as emp_code,mt.udise_sch_code as unique_key FROM mst_schools mt WHERE mt.udise_sch_code = $1`, [emp_code,contact]);
      return depot.rows[0];
    }
    else if(role === 8) {
      const depot = await pool.query(`SELECT mt.name_eng as name,mt.designation_name_eng as designation,mt.teacher_code as emp_code, mt.teacher_code as unique_key FROM mst_teacher mt WHERE mt.teacher_code = $1 AND mt.mobile_no=$2`, [emp_code,contact]);
      return depot.rows[0];
    }
    else if(role === 10) {
      const depot = await pool.query(`SELECT mt.emp_name as name,'private teacher' as designation,mt.nat_tch_id as emp_code,mt.nat_tch_id as unique_key FROM mst_udise_teacher mt WHERE mt.nat_tch_id = $1 AND mt.mobile=$2`, [emp_code,contact]);
      return depot.rows[0];
    }
    else {
      return false;
    }
}

const registerUserNew = async (req, res) => {
    const { role_id, emp_code, contact, password } = req.body;
    const role = parseInt(role_id);
    // --- Input Validation ---
    if (!role || !emp_code || !contact || !password) {
        return responseHandler(res, 400,'Missing required fields: role_id, emp_code, contact, password, and email are required.');
    }

    try {
        // --- Step 1: Check if user already exists in mst_users ---
        const existingUser = await pool.query(
            `SELECT user_id FROM mst_users WHERE email = $1 OR contact_number = $2 and role_id = $3`,
            [emp_code, contact, role]
        );

        if (existingUser.rows.length > 0) {
            return responseHandler(res, 409,'A user with this employee_code or contact number already exists.');
        }

        // --- Step 2: Validate user data against master tables using your function ---
        const userDataFromMaster = await getDataRoleUser(role, emp_code, contact);

        if (!userDataFromMaster) {
            return responseHandler(res, 404,'User data not found in master records. Please check role, employee code, and contact number.');
        }

        // --- Step 3: Hash the password ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Step 4: Get table/column mapping for the role ---
        const mapping = roleMappings[role] || { table_name: null, column_name: null };

        // --- Step 5: Insert the new user into the database ---
        const insertQuery = `
            INSERT INTO mst_users 
            (name, email, password, role_id, contact_number, table_name, column_name, column_value, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Approved')
            RETURNING user_id, name, email as emp_code, created_at;
        `;

        const values = [
            userDataFromMaster.name,
            role===9 || role===5?contact:emp_code,
            hashedPassword,
            role,
            contact,
            mapping.table_name,
            mapping.column_name,
            userDataFromMaster.unique_key || emp_code,
        ];

        const newUser = await pool.query(insertQuery, values);

        // --- Step 6: Send success response ---
        return responseHandler(res, 200,'User registered successfully. Approval is pending.',newUser.rows[0]);

    } catch (error) {
        console.error('Registration Error:', error);
        return responseHandler(res, 500, 'An internal server error occurred during registration.' + error.message, null, error);
    }
};

const insertCacUsers = async (req, res) => {
  try {
    // Fetch only new CAC records not in history
    const { rows: cacRecords } = await pool.query(`
      SELECT * FROM mst_cac 
      WHERE cluster_cd NOT IN (
        SELECT cluster_cd FROM mst_cac_insert_history
      )
    `);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of cacRecords) {
      const clusterCdStr = record.cluster_cd?.toString();
      const email = clusterCdStr;

      // 🔒 Failsafe email existence check in mst_users
      const { rowCount: userExists } = await pool.query(
        'SELECT 1 FROM mst_users WHERE email = $1',
        [email]
      );

      if (userExists > 0) {
        console.log(`⏭️ Skipped (exists in mst_users): ${email}`);
        skippedCount++;

        // Still mark in history to avoid rechecking again
        await pool.query(
          'INSERT INTO mst_cac_insert_history (cluster_cd) VALUES ($1) ON CONFLICT DO NOTHING',
          [record.cluster_cd]
        );

        continue;
      }

      // Hash password and insert user
      const password = await bcrypt.hash(clusterCdStr, 12);

      await pool.query(
        `INSERT INTO mst_users (
          name, email, password, role_id, contact_number,
          table_name, column_name, column_value, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, CURRENT_TIMESTAMP
        )`,
        [
          record.cac_name || 'Cac User',
          email,
          password,
          6,
          record.cac_mobile,
          'mst_cac',
          'cluster_cd',
          clusterCdStr,
          'Approved',
        ]
      );

      // Add to history table
      await pool.query(
        'INSERT INTO mst_cac_insert_history (cluster_cd) VALUES ($1)',
        [record.cluster_cd]
      );

      insertedCount++;
      console.log(`✅ Inserted: ${email}`);
    }

    return res.status(200).json({
      message: 'CAC user insert process completed',
      totalRecords: cacRecords.length,
      insertedCount,
      skippedCount,
    });
  } catch (error) {
    console.error('❌ Error inserting CAC users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const insertDeoUsers = async (req, res) => {
  try {
    // Fetch only new CAC records not in history
    const { rows: deoRecords } = await pool.query(`
      SELECT * FROM mst_deo 
      WHERE district_cd NOT IN (
        SELECT district_cd FROM mst_deo_insert_history
      )
    `);
    if (deoRecords.length === 0) {
      return res.status(200).json({
        message: 'No new DEO records to insert',
        totalRecords: 0,
        insertedCount: 0,
        skippedCount: 0,
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of deoRecords) {
      const districtCdStr = record.mobile?.toString();
      const email = districtCdStr;

      // 🔒 Failsafe email existence check in mst_users
      const { rowCount: userExists } = await pool.query(
        'SELECT 1 FROM mst_users WHERE email = $1',
        [email]
      );

      if (userExists > 0) {
        console.log(`⏭️ Skipped (exists in mst_users): ${email}`);
        skippedCount++;

        // Still mark in history to avoid rechecking again
        await pool.query(
          'INSERT INTO mst_deo_insert_history (district_cd) VALUES ($1) ON CONFLICT DO NOTHING',
          [record.district_cd]
        );

        continue;
      }

      // Hash password and insert user
      const password = await bcrypt.hash(districtCdStr, 12);

      await pool.query(
        `INSERT INTO mst_users (
          name, email, password, role_id, contact_number,
          table_name, column_name, column_value, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, CURRENT_TIMESTAMP
        )`,
        [
          record.deo_name || 'Deo User',
          record.mobile,
          password,
          4,
          record.mobile,
          'mst_deo',
          'district_cd',
          record.district_cd,
          'Approved',
        ]
      );

      // Add to history table
      await pool.query(
        'INSERT INTO mst_deo_insert_history (district_cd) VALUES ($1)',
        [record.district_cd]
      );

      insertedCount++;
      console.log(`✅ Inserted: ${email}`);
    }

    return res.status(200).json({
      message: 'DEO user insert process completed',
      totalRecords: deoRecords.length,
      insertedCount,
      skippedCount,
    });
  } catch (error) {
    console.error('❌ Error inserting DEO users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const insertBeoUsers = async (req, res) => {
  try {
    // Fetch only new CAC records not in history
    const { rows: beo_records } = await pool.query(`
      SELECT * FROM mst_beo
      WHERE block_cd NOT IN (
        SELECT block_cd FROM mst_beo_insert_history
      )
    `);
    if (beo_records.length === 0) {
      return res.status(200).json({
        message: 'No new BEO records to insert',
        totalRecords: 0,
        insertedCount: 0,
        skippedCount: 0,
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of beo_records) {
      const block_cdr = record.mobile?.toString();
      const email = block_cdr;

      // 🔒 Failsafe email existence check in mst_users
      const { rowCount: userExists } = await pool.query(
        'SELECT 1 FROM mst_users WHERE email = $1',
        [email]
      );

      if (userExists > 0) {
        console.log(`⏭️ Skipped (exists in mst_users): ${email}`);
        skippedCount++;

        // Still mark in history to avoid rechecking again
        await pool.query(
          'INSERT INTO mst_beo_insert_history (block_cd) VALUES ($1) ON CONFLICT DO NOTHING',
          [record.block_cd]
        );

        continue;
      }

      // Hash password and insert user
      const password = await bcrypt.hash(block_cdr, 12);

      await pool.query(
        `INSERT INTO mst_users (
          name, email, password, role_id, contact_number,
          table_name, column_name, column_value, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, CURRENT_TIMESTAMP
        )`,
        [
          record.beo_name || 'Beo User',
          record.mobile, 
          password,
          5,
          record.mobile,
          'mst_beo',
          'block_cd',
          record.block_cd,
          'Approved',
        ]
      );

      // Add to history table
      await pool.query(
        'INSERT INTO mst_beo_insert_history (block_cd) VALUES ($1) ON CONFLICT DO NOTHING',
        [record.block_cd]
      );

      insertedCount++;
      console.log(`✅ Inserted: ${email}`);
    }

    return res.status(200).json({
      message: 'BEO user insert process completed',
      totalRecords: beo_records.length,
      insertedCount,
      skippedCount,
    });
  } catch (error) {
    console.error('❌ Error inserting BEO users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const insertProgrammerUsers = async (req, res) => {
  try {
    // Fetch only new programmer records not in history
    const { rows: programmerRecords } = await pool.query(`
      SELECT * FROM mst_programmers 
      WHERE district_cd NOT IN (
        SELECT district_cd FROM mst_programmer_insert_history
      )
    `);
    if (programmerRecords.length === 0) {
      return res.status(200).json({
        message: 'No new programmer records to insert',
        totalRecords: 0,
        insertedCount: 0,
        skippedCount: 0,
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of programmerRecords) {
      const districtCdStr = record.mobile?.toString();
      const email = districtCdStr;

      // 🔒 Failsafe email existence check in mst_users
      const { rowCount: userExists } = await pool.query(
        'SELECT 1 FROM mst_users WHERE email = $1',
        [email]
      );

      if (userExists > 0) {
        console.log(`⏭️ Skipped (exists in mst_users): ${email}`);
        skippedCount++;

        // Still mark in history to avoid rechecking again
        await pool.query(
          'INSERT INTO mst_programmer_insert_history (district_cd) VALUES ($1) ON CONFLICT DO NOTHING',
          [record.district_cd]
        );

        continue;
      }

      // Hash password and insert user
      const password = await bcrypt.hash(districtCdStr, 12);

      await pool.query(
        `INSERT INTO mst_users (
          name, email, password, role_id, contact_number,
          table_name, column_name, column_value, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, CURRENT_TIMESTAMP
        )`,
        [
          record.programmer_name || 'Programmer User',
          record.mobile,
          password,
          9, // role_id for programmer (change if needed)
          record.mobile,
          'mst_programmers',
          'district_cd',
          record.district_cd,
          'Approved',
        ]
      );

      // Add to history table
      await pool.query(
        'INSERT INTO mst_programmer_insert_history (district_cd) VALUES ($1)',
        [record.district_cd]
      );

      insertedCount++;
      console.log(`✅ Inserted: ${email}`);
    }

    return res.status(200).json({
      message: 'Programmer user insert process completed',
      totalRecords: programmerRecords.length,
      insertedCount,
      skippedCount,
    });
  } catch (error) {
    console.error('❌ Error inserting programmer users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const insertJoinDirectorUsers = async (req, res) => {
  try {
    // Fetch only new join_directors not already inserted
    const { rows: director_records } = await pool.query(`
      SELECT * FROM mst_join_directors
      WHERE id NOT IN (
        SELECT division_id FROM mst_directors_insert_history
      )
    `);
    if (director_records.length === 0) {
      return res.status(200).json({
        message: 'No new join_director records to insert',
        totalRecords: 0,
        insertedCount: 0,
        skippedCount: 0,
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of director_records) {
      const email = record.contact_number;

      // 🔒 Failsafe email existence check in mst_users
      const { rowCount: userExists } = await pool.query(
        'SELECT 1 FROM mst_users WHERE email = $1',
        [email]
      );

      if (userExists > 0) {
        console.log(`⏭️ Skipped (exists in mst_users): ${email}`);
        skippedCount++;

        // Still mark in history to avoid rechecking again
        await pool.query(
          'INSERT INTO mst_directors_insert_history (division_id) VALUES ($1) ON CONFLICT DO NOTHING',
          [record.division_id ]
        );

        continue;
      }

      // Hash password and insert user
      const password = await bcrypt.hash(email, 12);

      await pool.query(
        `INSERT INTO mst_users (
          name, email, password, role_id, contact_number,
          table_name, column_name, column_value, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, CURRENT_TIMESTAMP
        )`,
        [
          record.name || 'Director User',
          record.contact_number,
          password,
          12, // role_id for director (change if needed)
          record.contact_number,
          'mst_join_directors',
          'division_id',
          record.division_id,
          'Approved',
        ]
      );

      // Add to history table
      await pool.query(
        'INSERT INTO mst_directors_insert_history (division_id) VALUES ($1)',
        [record.division_id]
      );

      insertedCount++;
      console.log(`✅ Inserted: ${email}`);
    }

    return res.status(200).json({
      message: 'Join Director user insert process completed',
      totalRecords: director_records.length,
      insertedCount,
      skippedCount,
    });
  } catch (error) {
    console.error('❌ Error inserting join director users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const getUserByIdAndRole = async (req,res) => {
  /* #swagger.tags = ['Auth'] */
  const {role_id,emp_code,contact} = req.query;
  try {
    await getDataRoleUser(role_id,emp_code,contact).then((data)=>{
      if(data) {
       return responseHandler(res, 200, 'User fetched successfully', data);
      } else {
       return responseHandler(res, 404, 'User not found');
      }
    });
    // const user = await pool.query(`SELECT * FROM mst_users WHERE role_id=$1 AND column_value=$2`, [role_id, emp_code]);
  } catch (error) {
    console.error('Error fetching user by ID and role:', error);
    return responseHandler(res, 500, 'Error fetching user by ID and role', null, error);
  }
}




const registerUser = async (req, res) => {
  /* #swagger.tags = ['Auth'] */

  try {
    const { name, email, password, role_id, contact, address, unique_code } = req.body;
    const role_number = parseInt(role_id); // Convert role_id to an integer

    const roleMapping = roleMappings[role_number];

    if (!roleMapping) {
      return responseHandler(res, 400, 'Invalid role_id');
    }

    const { table_name, column_name } = roleMapping;
    const roles = await pool.query(`SELECT * FROM mst_roles WHERE role_id=$1`, [role_number]);

    const existingUser = await pool.query(`SELECT * FROM mst_users WHERE contact_number = $1 OR email=$2`, [contact, email]);
    if (existingUser.rows.length > 0) {
      return responseHandler(res, 400, 'Code For '+roles.rows[0].role_name+' Or Mobile Number Already registered');
    }
    if(role_number === 1 || role_number === 2 || role_number === 11) {
      const hashedPassword = await bcrypt.hash(password, 12);

      await pool.query(
        `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
        [name, email, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
      );
      responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
    } else {
      let checkDB = "";

      if (unique_code !== "") {
        checkDB = await pool.query(`SELECT *, ${column_name} as col  FROM ${table_name} WHERE ${column_name} = $1`, [unique_code]);
      }
      if (checkDB?.rows?.length > 0) {
        const hashedPassword = await bcrypt.hash(password, 12);
         if (role_number === 6) {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
            [checkDB.rows[0]?.name_eng, checkDB.rows[0]?.teacher_code, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        }else 
        if (role_number === 8) {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
            [checkDB.rows[0]?.name_eng, checkDB.rows[0]?.teacher_code, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        } else if (role_number === 10) {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
            [checkDB.rows[0]?.emp_name, checkDB.rows[0]?.nat_tch_id, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        }else {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
            [name, email, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        }


      }
      else {
        return responseHandler(res, 400, `${roles.rows[0].role_name} Not Found in our Database`);
      }
    }
  } catch (error) {
    console.error('Error registering user:', error);
    responseHandler(res, 500, 'Error registering user', null, error);
  }
};

// const registerUser = async (req, res) => {
//   /* #swagger.tags = ['Auth'] */

//   try {
//     const { name, email, password, role_id, contact, address, unique_code } = req.body;
//     const role_number = parseInt(role_id); // Convert role_id to an integer

//     const roleMapping = roleMappings[role_number];

//     if (!roleMapping) {
//       return responseHandler(res, 400, 'Invalid role_id');
//     }

//     const { table_name, column_name } = roleMapping;
//     const roles = await pool.query(`SELECT * FROM mst_roles WHERE role_id=$1`, [role_number]);

//     const existingUser = await pool.query(`SELECT * FROM mst_users WHERE contact_number = $1 OR email=$2`, [contact, email]);
//     if (existingUser.rows.length > 0) {
//       return responseHandler(res, 400, 'Already registered');
//     }
//     if (role_number === 1 || role_number === 2) {
//       const hashedPassword = await bcrypt.hash(password, 12);

//       await pool.query(
//         `INSERT INTO mst_users 
//           (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
//           VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
//         [name, email, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
//       );

//       responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
//     } else {
//       let checkDB = "";

//       if (unique_code !== "") {
//         checkDB = await pool.query(`SELECT *, ${column_name} as col  FROM ${table_name} WHERE ${column_name} = $1`, [unique_code]);
//       }
//       if (checkDB?.rows?.length > 0) {
//         const hashedPassword = await bcrypt.hash(password, 12);
//         if (role_number === 8) {
//           await pool.query(
//             `INSERT INTO mst_users 
//           (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
//           VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
//             [checkDB.rows[0]?.name_eng, checkDB.rows[0]?.teacher_code, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
//           );
//           return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
//         } else if (role_number === 10) {
//           await pool.query(
//             `INSERT INTO mst_users 
//           (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
//           VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
//             [checkDB.rows[0]?.emp_name, checkDB.rows[0]?.nat_tch_id, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
//           );
//           return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
//         }else {
//           await pool.query(
//             `INSERT INTO mst_users 
//           (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
//           VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Approved', NULL)`,
//             [name, email, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
//           );
//           return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
//         }


//       }
//       else {
//         return responseHandler(res, 400, `${roles.rows[0].role_name} Not Found in our Database`);
//       }
//     }
//   } catch (error) {
//     console.error('Error registering user:', error);
//     responseHandler(res, 500, 'Error registering user', null, error);
//   }
// };

// const loginUser = async (req, res) => {
//   /* #swagger.tags = ['Auth'] */
//   try {
//     const { email, password } = req.body;
//     const result = await pool.query('SELECT * FROM mst_users WHERE email = $1 or contact_number = $1', [email]);

//     if (!result.rows.length) return responseHandler(res, 400, 'Credential Not Found');

//     const user = result.rows[0];
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return responseHandler(res, 401, 'Invalid credentials');

//     const token = jwt.sign({ user_id: user.user_id, role: user.role_id }, process.env.JWT_SECRET, {
//       expiresIn: '1h',
//     });

//     responseHandler(res, 200, 'Login successful', { token, user });
//   } catch (error) {
//     responseHandler(res, 400, 'Error logging in', null, error);
//   }
// };

const loginUser = async (req, res) => {
  /* #swagger.tags = ['Auth'] */
  /* #swagger.consumes = ['application/json']  
  #swagger.schema = [$ref: "#/definitions/Auth"]
*/
  try {
    const { email, password } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM mst_users WHERE email = $1 OR contact_number = $1',
      [email]
    );

    if (!userResult.rows.length) return responseHandler(res, 400, 'Credential Not Found');

    const user = userResult.rows[0];


    if (user.status === "Pending") return responseHandler(res, 400, 'Please Wait for Admin Approval!');
    if (user.status === "Rejected") return responseHandler(res, 400, 'Your Registration is Rejected! Please contact Admin!');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return responseHandler(res, 401, 'Invalid credentials');

    let additionalDetails = null;


    if (user.table_name && user.column_name && user.column_value) {
      let detailsQuery = "";
      if (user.role_id === 8) {
        //detailsQuery = `SELECT * FROM ${user.table_name} as tch LEFT JOIN mst_schools as ms ON ms.udise_sch_code = tch.udise_sch_code WHERE ${user.column_name} = $1 `;
        detailsQuery = `SELECT ms.*,tch.name_eng as emp_name,tch.designation_name_eng as designation_name, tch.designation_id as tch_type,tch.teacher_code as nat_tch_id,ms.medium as school_medium_id
        FROM ${user.table_name} as tch LEFT JOIN mst_schools as ms ON ms.udise_sch_code::bigint = tch.current_udise_id::bigint 
        WHERE ${user.column_name} = $1 `;
      }
       else {
        detailsQuery = `SELECT * FROM ${user.table_name} WHERE ${user.column_name} = $1`;
      }

      const detailsResult = await pool.query(detailsQuery, [user.column_value]);

      if (detailsResult.rows.length) {
        additionalDetails = detailsResult.rows[0];
      }
    }
    

    const token = jwt.sign({ user_id: user.user_id, role: user.role_id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    let assignedBooks = [];
    if (user.role_id === 2) {
      const booksQuery = await pool.query(
        `SELECT ba.id, b.isbn_code,b.id as book_id, b.class_level, b.front_cover_url, b.back_cover_url, b.content_rcv_yn, ba.quantity, ba.assigned_date
         FROM tbc_book_assignments ba
         JOIN tbc_books b ON ba.book_id = b.id
         WHERE ba.publisher_id = $1
         ORDER BY ba.assigned_date DESC`,
        [user.user_id]
      );
      assignedBooks = booksQuery.rows;
    }

    responseHandler(res, 200, 'Login successful', { token, user, additionalDetails });
  } catch (error) {
    console.error('Error logging in:', error);
    responseHandler(res, 500, 'Error logging in', null, error);
  }
};


const getRole = async (req, res) => {
  /* #swagger.tags = ['Auth'] */
  try {
    // const users = await pool.query('SELECT * FROM mst_roles WHERE role_id NOT IN(1,9)');
    const users = await pool.query('SELECT * FROM mst_roles');
    responseHandler(res, 200, 'Roles fetched', users.rows);
  } catch (e) {
    responseHandler(res, 400, 'Error fetching roles', null, e);
  }
};
const getRoleId = async (req, res) => {
  /* #swagger.tags = ['Auth'] */
  try {
    const role_id = req.user.role;
    // const users = await pool.query('SELECT * FROM mst_roles WHERE role_id NOT IN(1,9)');
    let role = []
    if(role_id === 1) {
      role = await pool.query('SELECT * FROM mst_roles');
    }
    if(role_id === 9) {
     role = await pool.query('SELECT * FROM mst_roles where role_id in (4,5,6,8,10)');
    }
     if(role_id === 6) {
     role = await pool.query('SELECT * FROM mst_roles where role_id in (7,8,10)');
    }
    if(role_id === 5) {
     role = await pool.query('SELECT * FROM mst_roles where role_id in (6,7,8,10)');
    }
    if(role_id === 4) {
     role = await pool.query('SELECT * FROM mst_roles where role_id in (5,6,7,8,10)');
    }
    responseHandler(res, 200, 'Roles fetched', role?.rows);
  } catch (e) {
    responseHandler(res, 400, 'Error fetching roles', null, e);
  }
};


const registerCac = async (req, res) => {
  try {
    const {
      role,
      clusterId,
      clsMobile,
      blockId,
      beoOfficerName,
      blkMobile,
      districtId,
      district_cd,
      deoOfficerName,
      distMobile,
      stateId,
      stateMobile,
      proMobile,
      password,
    } = req.body;

    if (!clusterId && !blockId && !districtId && !stateId && !proMobile) {
      return res.status(400).json({ success: false, message: "Please provide user id!" });
    }
    if (!clsMobile && !blkMobile && !distMobile && !stateMobile && !password) {
      return res.status(400).json({ success: false, message: "Please provide user mobile number or password" });
    }

    const client = await pool.connect();

    if (stateId && stateMobile) {
      const existingState = await client.query("SELECT * FROM cac_registration WHERE state_id = $1", [stateId]);
      if (existingState.rows.length > 0) {
        client.release();
        return res.status(409).json({ success: false, message: "State is already registered" });
      }
      if (stateId != 22) {
        client.release();
        return res.status(409).json({ success: false, message: "Please input C.G. State Id" });
      }
      const newState = await client.query(
        "INSERT INTO cac_registration (state_id, state_mobile) VALUES ($1, $2) RETURNING *",
        [stateId, stateMobile]
      );
      client.release();
      return res.status(201).json({ success: true, message: "State registered successfully", data: newState.rows[0] });
    }

    if (role === "deo" && districtId && distMobile) {
      const districtMatched = await client.query("SELECT * FROM school_infra WHERE district_cd = $1", [districtId]);
      if (districtMatched.rows.length === 0) {
        client.release();
        return res.status(404).json({ success: false, message: "Invalid districtId" });
      }

      const existingDistrict = await client.query("SELECT * FROM cac_registration WHERE district_id = $1 AND role = 'deo'", [districtId]);
      if (existingDistrict.rows.length > 0) {
        client.release();
        return res.status(409).json({ success: false, message: "District is already registered" });
      }

      const newDistrict = await client.query(
        "INSERT INTO cac_registration (role, district_id, district_name, deo_officer_name, dist_mobile) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [role, districtId, districtMatched.rows[0].district_name || "", deoOfficerName, distMobile]
      );
      client.release();
      return res.status(201).json({ success: true, message: "District registered successfully", data: newDistrict.rows[0] });
    }

    if (role === "beo" && blockId && blkMobile) {
      const blockMatched = await client.query("SELECT * FROM school_infra WHERE block_cd = $1", [blockId]);
      if (blockMatched.rows.length === 0) {
        client.release();
        return res.status(404).json({ success: false, message: "Invalid blockId" });
      }

      const existingBlock = await client.query("SELECT * FROM cac_registration WHERE block_id = $1 AND role = 'beo'", [blockId]);
      if (existingBlock.rows.length > 0) {
        client.release();
        return res.status(409).json({ success: false, message: "Block is already registered" });
      }

      const newBlock = await client.query(
        "INSERT INTO cac_registration (role, district_id, district_name, block_id, block_name, beo_officer_name, blk_mobile) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [role, blockMatched.rows[0].district_cd || "", blockMatched.rows[0].district_name || "", blockId, blockMatched.rows[0].block_name || "", beoOfficerName, blkMobile]
      );
      client.release();
      return res.status(201).json({ success: true, message: "Block registered successfully", data: newBlock.rows[0] });
    }

    if (clusterId && clsMobile) {
      const clusterMatched = await client.query("SELECT * FROM school_infra WHERE cluster_cd = $1", [clusterId]);
      if (clusterMatched.rows.length === 0) {
        client.release();
        return res.status(404).json({ success: false, message: "Invalid clusterId" });
      }

      const existingCluster = await client.query("SELECT * FROM cac_registration WHERE cluster_id = $1", [clusterId]);
      if (existingCluster.rows.length > 0) {
        client.release();
        return res.status(409).json({ success: false, message: "Cluster is already registered" });
      }

      const newCluster = await client.query(
        "INSERT INTO cac_registration (cluster_id, cls_mobile) VALUES ($1, $2) RETURNING *",
        [clusterId, clsMobile]
      );
      client.release();
      return res.status(201).json({ success: true, message: "Cluster registered successfully", data: newCluster.rows[0] });
    }

    if (role === "pro" && proMobile && password) {
      const programmerMatched = await client.query("SELECT * FROM programmer WHERE mobile = $1 AND district_cd = $2", [proMobile, district_cd]);
      if (programmerMatched.rows.length === 0) {
        client.release();
        return res.status(404).json({ success: false, message: "Invalid Programmer Number" });
      }

      const existingProgrammer = await client.query("SELECT * FROM cac_registration WHERE pro_mobile = $1 AND role = 'pro' AND district_id = $2", [proMobile, district_cd]);
      if (existingProgrammer.rows.length > 0) {
        client.release();
        return res.status(409).json({ success: false, message: "Programmer is already registered" });
      }

      const newProgrammer = await client.query(
        "INSERT INTO cac_registration (district_id, district_name, pro_mobile, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [programmerMatched.rows[0].district_cd || "", programmerMatched.rows[0].district_name || "", proMobile, password, role]
      );
      client.release();
      return res.status(201).json({ success: true, message: "Programmer registered successfully", data: newProgrammer.rows[0] });
    }

    client.release();
    return res.status(400).json({ success: false, message: "Invalid registration data." });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = registerCac;


module.exports = { registerUser, loginUser, getRole,getRoleId,getUserByIdAndRole,registerUserNew,insertCacUsers,insertDeoUsers,insertProgrammerUsers,insertBeoUsers,insertJoinDirectorUsers };
