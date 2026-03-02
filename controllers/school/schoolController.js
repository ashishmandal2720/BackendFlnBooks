const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getPrivateSchoolsByDepot = async (req, res) => {
  /* #swagger.tags = ['Schools'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { district_cd, block_cd, cluster_cd } = req.body;

    if (!Array.isArray(district_cd) || district_cd.length === 0) {
      return res.status(400).json({
        success: false,
        message: "district_cd must be a non-empty array",
      });
    }

    const sch_category_id = [1, 2, 3, 4, 5, 6, 7, 8, 10];
    const affil_board = [0, 2, 7, 8];
    const schMgmtIds = [4, 5];

    let values = [];
    let conditions = [];

    // district_cd placeholders
    const districtPlaceholders = district_cd
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...district_cd);
    conditions.push(`district_cd IN (${districtPlaceholders})`);

    // sch_category_id placeholders
    const categoryPlaceholders = sch_category_id
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...sch_category_id);
    conditions.push(`sch_category_id IN (${categoryPlaceholders})`);

    // affil_board placeholders
    const affilBoardPlaceholders = affil_board
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...affil_board);
    conditions.push(`affil_board IN (${affilBoardPlaceholders})`);

    values.push(...schMgmtIds);
    const placeholders = schMgmtIds.map(
      (_, idx) => `$${values.length - schMgmtIds.length + idx + 1}`
    );
    conditions.push(`sch_mgmt_id IN (${placeholders.join(", ")})`);

    // Optional filters
    if (block_cd) {
      values.push(block_cd);
      conditions.push(`block_cd = $${values.length}`);
    }

    if (cluster_cd) {
      values.push(cluster_cd);
      conditions.push(`cluster_cd = $${values.length}`);
    }

    // Static filters
    values.push(0); // sch_status_id
    conditions.push(`sch_status_id = $${values.length}`);

    const query = `
      SELECT 
        udise_sch_code, school_name, district_cd, district_name, 
        block_cd, block_name, cluster_cd,cluster_name, sch_category_id, 
        sch_type_id, sch_mgmt_id
      FROM mst_schools 
      WHERE ${conditions.join(" AND ")}
    `;

    const result = await pool.query(query, values);

    return responseHandler(
      res,
      200,
      "Schools fetched successfully",
      result.rows,
      null,
      result.rowCount
    );
  } catch (error) {
    console.error("Error fetching private  schools:", error);
    return responseHandler(res, 400, "Error fetching schools", null, error);
  }
};

const getHighSchoolByDepot = async (req, res) => {
  /* #swagger.tags = ['Schools'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { district_cd, block_cd, cluster_cd } = req.body;

    if (!Array.isArray(district_cd) || district_cd.length === 0) {
      return res.status(400).json({
        success: false,
        message: "district_cd must be a non-empty array",
      });
    }

    const sch_category_id = [6, 7, 8, 3, 5, 10];
    const affil_board = [0, 2, 7, 8];

    let values = [];
    let conditions = [];

    // district_cd placeholders
    const districtPlaceholders = district_cd
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...district_cd);
    conditions.push(`district_cd IN (${districtPlaceholders})`);

    // sch_category_id placeholders
    const categoryPlaceholders = sch_category_id
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...sch_category_id);
    conditions.push(`sch_category_id IN (${categoryPlaceholders})`);

    // affil_board placeholders
    const affilBoardPlaceholders = affil_board
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...affil_board);
    conditions.push(`affil_board IN (${affilBoardPlaceholders})`);

    // Optional filters
    if (block_cd) {
      values.push(block_cd);
      conditions.push(`block_cd = $${values.length}`);
    }

    if (cluster_cd) {
      values.push(cluster_cd);
      conditions.push(`cluster_cd = $${values.length}`);
    }

    // Static filters
    values.push(1); // sch_mgmt_id
    conditions.push(`sch_mgmt_id = $${values.length}`);

    values.push(0); // sch_status_id
    conditions.push(`sch_status_id = $${values.length}`);

    const query = `
        SELECT 
          udise_sch_code, school_name, district_cd, district_name, 
          block_cd, block_name, cluster_cd,cluster_name, sch_category_id, 
          sch_type_id, sch_mgmt_id
        FROM mst_schools 
        WHERE ${conditions.join(" AND ")}
      `;

    const result = await pool.query(query, values);

    return responseHandler(
      res,
      200,
      "Schools fetched successfully",
      result.rows,
      null,
      result.rowCount
    );
  } catch (error) {
    console.error("Error fetching high schools:", error);
    return responseHandler(res, 400, "Error fetching schools", null, error);
  }
};

const getSchoolByCluster = async (req, res) => {
  /* #swagger.tags = ['Schools'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { cluster_cd } = req.body;

    const sch_category_id = [1, 2, 3, 4, 5, 6, 7];
    const affil_board = [0, 2, 7, 8];

    let values = [];
    let conditions = [];

    // sch_category_id placeholders
    const categoryPlaceholders = sch_category_id
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...sch_category_id);
    conditions.push(`sch_category_id IN (${categoryPlaceholders})`);

    // affil_board placeholders
    const affilBoardPlaceholders = affil_board
      .map((_, i) => `$${values.length + i + 1}`)
      .join(", ");
    values.push(...affil_board);
    conditions.push(`affil_board IN (${affilBoardPlaceholders})`);

    if (cluster_cd) {
      values.push(cluster_cd);
      conditions.push(`cluster_cd = $${values.length}`);
    }

    // Static filters
    values.push(1); // sch_mgmt_id
    conditions.push(`sch_mgmt_id = $${values.length}`);

    values.push(0); // sch_status_id
    conditions.push(`sch_status_id = $${values.length}`);

    const query = `
      SELECT 
        udise_sch_code, school_name, district_cd, district_name, 
        block_cd, block_name, cluster_cd,cluster_name, sch_category_id, 
        sch_type_id, sch_mgmt_id
      FROM mst_schools 
      WHERE ${conditions.join(" AND ")}
    `;
    const result = await pool.query(query, values);

    return responseHandler(
      res,
      200,
      "Cluster fetched successfully",
      result.rows,
      null,
      result.rowCount
    );
  } catch (error) {
    console.error("Error fetching high schools:", error);
    return responseHandler(res, 400, "Error fetching schools", null, error);
  }
};

const getHighSchoolsByUdise = async (req, res) => {
  const { udise_sch_code } = req.body;

  if (!udise_sch_code) {
    return res
      .status(400)
      .json({ success: false, message: "udise_sch_code is required" });
  }

  const query = `
    SELECT 
      ms.udise_sch_code,
      ms.school_name,
      ms.district_cd,
      ms.district_name,
      ms.block_cd,
      ms.block_name,
      ms.cluster_cd,
      ms.cluster_name,
      ms.sch_category_id,
      ms.sch_type_id,
      ms.sch_mgmt_id,
      COALESCE(cs.cls9t, 0) AS cls9t,
      COALESCE(cs.cls10t, 0) AS cls10t,
      COALESCE(cs.cls9t, 0) + COALESCE(cs.cls10t, 0) AS total_student
    FROM mst_schools ms
    LEFT JOIN central_student_counts cs ON ms.udise_sch_code = cs.udise_sch_code
    WHERE ms.udise_sch_code = $1
  `;

  try {
    const result = await pool.query(query, [udise_sch_code]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res.status(200).json({
      success: true,
      message: "Data received successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching school data:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// const getClusterWiseSchools = async (req, res) => {
//   const { udise_sch_code } = req.body;

//   if (!udise_sch_code) {
//     return res
//       .status(400)
//       .json({ success: false, message: "udise_sch_code is required" });
//   }

//   const query = `
//     SELECT 
//       ms.udise_sch_code,
//       ms.school_name,
//       ms.district_cd,
//       ms.district_name,
//       ms.block_cd,
//       ms.block_name,
//       ms.cluster_cd,
//       ms.cluster_name,
//       ms.sch_category_id,
//       ms.sch_type_id,
//       ms.sch_mgmt_id,
//       COALESCE(cs.cls1t, 0) AS cls1t,
//       COALESCE(cs.cls2t, 0) AS cls2t,
//       COALESCE(cs.cls3t, 0) AS cls3t,
//       COALESCE(cs.cls4t, 0) AS cls4t,
//       COALESCE(cs.cls5t, 0) AS cls5t,
//       COALESCE(cs.cls6t, 0) AS cls6t,
//       COALESCE(cs.cls7t, 0) AS cls7t,
//       COALESCE(cs.cls8t, 0) AS cls8t,
//       COALESCE(cs.cls1t, 0) + COALESCE(cs.cls2t, 0) + COALESCE(cs.cls3t, 0)+ COALESCE(cs.cls4t, 0)+ COALESCE(cs.cls5t, 0)+ COALESCE(cs.cls6t, 0)+ COALESCE(cs.cls7t, 0)+ COALESCE(cs.cls8t, 0) AS total_student
//     FROM mst_schools ms
//     LEFT JOIN central_student_counts cs ON ms.udise_sch_code = cs.udise_sch_code
//     WHERE ms.udise_sch_code = $1
//   `;

//   try {
//     const result = await pool.query(query, [udise_sch_code]);

//     if (result.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "School not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Data received successfully",
//       data: result.rows[0],
//     });
//   } catch (err) {
//     console.error("Error fetching school data:", err);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };

// const getClusterWiseSchools = async (req, res) => {
//   const { udise_sch_code } = req.body;

//   if (!udise_sch_code) {
//     return res
//       .status(400)
//       .json({ success: false, message: "udise_sch_code is required" });
//   }

//   const query = `
//   SELECT 
//       ms.udise_sch_code,
//       ms.school_name,
//       ms.district_cd,
//       ms.district_name,
//       ms.block_cd,
//       ms.block_name,
//       ms.cluster_cd,
//       ms.cluster_name,
//       ms.sch_category_id,
//       ms.sch_type_id,
//       ms.sch_mgmt_id,
//       COALESCE(sc.class_1, 0) AS cls1t,
//       COALESCE(sc.class_2, 0) AS cls2t,
//       COALESCE(sc.class_3, 0) AS cls3t,
//       COALESCE(sc.class_4, 0) AS cls4t,
//       COALESCE(sc.class_5, 0) AS cls5t,
//       COALESCE(sc.class_6, 0) AS cls6t,
//       COALESCE(sc.class_7, 0) AS cls7t,
//       COALESCE(sc.class_8, 0) AS cls8t,
//       COALESCE(sc.class_1, 0) + COALESCE(sc.class_2, 0) + COALESCE(sc.class_3, 0) + 
//       COALESCE(sc.class_4, 0) + COALESCE(sc.class_5, 0) + COALESCE(sc.class_6, 0) + 
//       COALESCE(sc.class_7, 0) + COALESCE(sc.class_8, 0) AS total_student
//     FROM mst_schools ms
//     LEFT JOIN cluster_student_count sc ON ms.udise_sch_code = sc.udise_sch_code
//     WHERE ms.udise_sch_code = $1
//   `;

//   try {
//     const result = await pool.query(query, [udise_sch_code]);

//     if (result.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "School not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Data received successfully",
//       data: result.rows[0],
//     });
//   } catch (err) {
//     console.error("Error fetching school data:", err);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };


const getClusterWiseSchools = async (req, res) => {
  const { udise_sch_code } = req.body;

  if (!udise_sch_code) {
    return res
      .status(400)
      .json({ success: false, message: "udise_sch_code is required" });
  }

  const query = `
WITH aggregated_students AS (
  SELECT
    udise_sch_code,
    SUM(COALESCE(class_1, 0)) AS class_1,
    SUM(COALESCE(class_2, 0)) AS class_2,
    SUM(COALESCE(class_3, 0)) AS class_3,
    SUM(COALESCE(class_4, 0)) AS class_4,
    SUM(COALESCE(class_5, 0)) AS class_5,
    SUM(COALESCE(class_6, 0)) AS class_6,
    SUM(COALESCE(class_7, 0)) AS class_7,
    SUM(COALESCE(class_8, 0)) AS class_8
  FROM cluster_student_count
  GROUP BY udise_sch_code
)

SELECT 
    ms.udise_sch_code,
    ms.school_name,
    ms.district_cd,
    ms.district_name,
    ms.block_cd,
    ms.block_name,
    ms.cluster_cd,
    ms.cluster_name,
    ms.sch_category_id,
    ms.sch_type_id,
    ms.sch_mgmt_id,
COALESCE(sc.class_1, '0')::INTEGER AS cls1t,
COALESCE(sc.class_2, '0')::INTEGER AS cls2t,
COALESCE(sc.class_3, '0')::INTEGER AS cls3t,
COALESCE(sc.class_4, '0')::INTEGER AS cls4t,
COALESCE(sc.class_5, '0')::INTEGER AS cls5t,
COALESCE(sc.class_6, '0')::INTEGER AS cls6t,
COALESCE(sc.class_7, '0')::INTEGER AS cls7t,
COALESCE(sc.class_8, '0')::INTEGER AS cls8t,

-- Total
COALESCE(sc.class_1, '0')::INTEGER + COALESCE(sc.class_2, '0')::INTEGER +
COALESCE(sc.class_3, '0')::INTEGER + COALESCE(sc.class_4, '0')::INTEGER +
COALESCE(sc.class_5, '0')::INTEGER + COALESCE(sc.class_6, '0')::INTEGER +
COALESCE(sc.class_7, '0')::INTEGER + COALESCE(sc.class_8, '0')::INTEGER AS total_student
FROM mst_schools ms
LEFT JOIN aggregated_students sc ON ms.udise_sch_code = sc.udise_sch_code
WHERE ms.udise_sch_code = $1;
  `;
  

  try {
    const result = await pool.query(query, [udise_sch_code]);

    if (result.rows.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "School not found" });
    }

    res.status(200).json({
      success: true,
      message: "Data received successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching school data:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createBookDistribution = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      udise_sch_code,
      school_name,
      medium,
      sch_category_id,
      sch_mgmt_id,
      total_std,
      challan_date,
      mst_challan_number,
      assigned_books,
    } = req.body;

    if (!Array.isArray(assigned_books) || assigned_books.length === 0) {
      return res.status(400).json({
        success: false,
        message: "assigned_books must be a non-empty array",
      });
    }

    const sender_id = req.user.user_id;

    await client.query("BEGIN"); // Start transaction

    // Insert into sch_book_distribution
    const distributionQuery = `
            INSERT INTO sch_book_distribution 
            (udise_sch_code, school_name, medium, sch_category_id, sch_mgmt_id, total_std, sender_id,  challan_date, mst_challan_number) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `;
    const distributionValues = [
      udise_sch_code,
      school_name,
      medium,
      sch_category_id,
      sch_mgmt_id,
      total_std,
      sender_id,
      challan_date,
      mst_challan_number,
    ];
    const result = await client.query(distributionQuery, distributionValues);

    const orderId = result.rows[0].id; // Get the inserted order_id

    // ✅ Correcting bulk insert query
    const assignedBooksQuery = `
            INSERT INTO sch_assigned_books 
            (order_id, class_level, subject_name, quantity, sets, books_per_set, open_book, total_weight) 
            VALUES ${assigned_books
              .map(
                (_, i) =>
                  `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${
                    i * 8 + 4
                  }, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${
                    i * 8 + 8
                  })`
              )
              .join(", ")}
        `;

    const assignedBooksValues = assigned_books.flatMap((book) => [
      orderId,
      book.class_level,
      book.subject_name,
      book.quantity,
      book.sets,
      book.books_per_set,
      book.open_book,
      book.total_weight,
    ]);

    await client.query(assignedBooksQuery, assignedBooksValues);

    await client.query("COMMIT"); // Commit transaction

    res.status(200).json({
      status: true,
      message: "Book distribution and assigned books added successfully",
      order_id: orderId,
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback in case of failure
    res
      .status(500)
      .json({ message: "Error inserting data", error: error.message });
  } finally {
    client.release(); // Release the client
  }
};


const getStudentCounts = async (req, res) => {
  // Destructure parameters from the request body
  const {
    districts,
    block_cd,
    cluster,
    class_level,
    division_id,
    depot_id,
    filter,
  } = req.body;

  try {
    let queryParams = [];
    let whereClause = [];
    let groupByFields = [];
    let paramIndex = 1;

    // Step 1: Normalize districts input
    let filteredDistricts = [];
    if (depot_id || division_id) {
      // Step 2: Fetch districts from depot/division if provided
      const table = depot_id ? "mst_depot" : "mst_division";
      const field = depot_id ? "depot_cd" : "division_id";
      const id = depot_id || division_id;

      const result = await pool.query(
        `SELECT district_cds FROM ${table} WHERE ${field} = $1 LIMIT 1`,
        [id]
      );

      if (!result.rows.length) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid ${field}` });
      }

   
      filteredDistricts = result.rows[0].district_cds.map(String);
    } else if (districts) {
      filteredDistricts = Array.isArray(districts)
        ? districts.map(String) // Ensure all elements are strings
        : [String(districts)]; // Convert single value to string and put in array
    }

    const allowedClassLevels = Array.from({ length: 12 }, (_, i) =>
      (i + 1).toString()
    );
    if (class_level && !allowedClassLevels.includes(String(class_level))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class_level. Use "1" to "12" as string.',
      });
    }

 
    const totalStudentsExpression = class_level
      ? `SUM(class_${String(class_level)})::bigint AS total_students`
      : `SUM(
            class_1 + class_2 + class_3 + class_4 + class_5 + 
            class_6 + class_7 + class_8 + class_9 + class_10 
          )::bigint AS total_students`;

    const totalSchoolsExpression = `COUNT(DISTINCT school_udise_code)::bigint AS total_schools`;

  
    if (filteredDistricts.length) {
      whereClause.push(`district_cd = ANY($${paramIndex})`);
      queryParams.push(filteredDistricts);
      paramIndex++;
    }
    if (block_cd) {
      whereClause.push(`block_cd = $${paramIndex}`);
      queryParams.push(block_cd);
      paramIndex++;
    }
    if (cluster) {
      whereClause.push(`cluster_cd = $${paramIndex}`);
      queryParams.push(cluster);
      paramIndex++;
    }

    const schoolTypeMap = {
      high: 2, // FIX 2: Changed values to numbers (integers) to match tbc_school_type column type
      private: 3,
      aatmanand: 1,
      pm_shree: 4,
    };

    if (filter && schoolTypeMap[filter.toLowerCase()] !== undefined) { // Check for undefined to ensure a valid mapping exists
      whereClause.push(`tbc_school_type = $${paramIndex}`);
      queryParams.push(schoolTypeMap[filter.toLowerCase()]);
      paramIndex++;
    }

    if (cluster) {
      // If cluster is provided, group by school level
      groupByFields = [
        "district_cd",
        "district_name",
        "block_cd",
        "block_name",
        "cluster_cd",
        "cluster_name",
        "school_name",
        "school_udise_code" 
      ];
    } else if (block_cd) {
      groupByFields = [
        "district_cd",
        "district_name",
        "block_cd",
        "block_name",
        "cluster_cd",
        "cluster_name"
      ];
    } else if (depot_id || division_id) {
      groupByFields = ["district_cd", "district_name"];
    } else if (filteredDistricts.length > 0) {
      groupByFields = [
        "district_cd",
        "district_name",
        "block_cd",
        "block_name"
      ];
    } else {
      // If no specific district, block, or cluster is provided, default to district level aggregation
      groupByFields = ["district_cd", "district_name"];
    }
    const orderByFields = [];
    if (groupByFields.includes("district_name")) orderByFields.push("district_name");
    if (groupByFields.includes("block_name")) orderByFields.push("block_name");
    if (groupByFields.includes("cluster_name")) orderByFields.push("cluster_name");
    if (groupByFields.includes("school_name")) orderByFields.push("school_name");


    const query = `
      SELECT 
        ${groupByFields.join(", ")},
        ${totalStudentsExpression},
        ${totalSchoolsExpression}
      FROM student_counts
      ${whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : ""}
      GROUP BY ${groupByFields.join(", ")}
      ${orderByFields.length > 0 ? `ORDER BY ${orderByFields.join(", ")}` : ""}
    `;

    const result = await pool.query(query, queryParams);

    // Step 9: Format output
    const data = result.rows.map((row) => ({
      district_cd: row.district_cd || null,
      district_name: row.district_name || null,
      block_cd: row.block_cd || null,
      block_name: row.block_name || null,
      cluster_cd: row.cluster_cd || null,
      cluster_name: row.cluster_name || null,
      school_name: row.school_name || null,
      total_students: row.total_students ? Number(row.total_students) : 0,
      total_schools: row.total_schools ? Number(row.total_schools) : 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Student counts fetched successfully",
      data,
    });
  } catch (err) {
    console.error("Error executing query:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const studentCountDepotWise = async (req, res) => {
  const {
    filter,
    class_level,
    division_id,
    depot_id,
    category = "depot", 
  } = req.body;

  try {
    const allDistrictsResult = await pool.query(
      `SELECT district_cd::text, district_name FROM mst_district`
    );
    const districtLookup = new Map();
    allDistrictsResult.rows.forEach(d => {
      districtLookup.set(d.district_cd, d.district_name);
    });

   
    let districtsFromCategory = [];
    let categoryTable;
    let categoryNameField;
    let categoryIdField;
    let categoryId;
    let categoryIdValue; // To hold the parsed numeric ID

    if (category === "districts") {
      categoryTable = "mst_district"; // Assuming a table for districts
      categoryNameField = "district_name";
      categoryIdField = "district_cd"; // Assuming district_cd is the ID field for districts
      // When category is 'districts', we don't filter by a single division/depot ID initially.
      // We will select all districts and then apply other filters.
    } else {
      categoryTable = category === "division" ? "mst_division" : "mst_depot";
      categoryNameField = category === "division" ? "division_name" : "depot_name";
      categoryIdField = category === "division" ? "division_id" : "depot_cd"; // This field is likely INTEGER/BIGINT

      categoryId = division_id || depot_id;

      if (categoryId) {
        // IMPORTANT CHANGE HERE: Attempt to parse categoryId as an integer
        // Only do this if the database column for categoryIdField is truly numeric.
        // If your DB columns (division_id, depot_cd) are actually TEXT/VARCHAR,
        // then you should remove the parseInt and keep the $1::text cast.
        categoryIdValue = parseInt(categoryId, 10);
        if (isNaN(categoryIdValue)) {
            return res.status(400).json({ success: false, message: `Invalid ${categoryIdField}: Must be a number.` });
        }

        const result = await pool.query(
          `SELECT district_cds FROM ${categoryTable} WHERE ${categoryIdField} = $1 LIMIT 1`, // Removed ::text cast from $1
          [categoryIdValue] // Pass the parsed integer value
        );

        if (!result.rows.length) {
          return res
            .status(400)
            .json({ success: false, message: `Invalid ${categoryIdField}` });
        }
        // Ensure district_cds are strings if they aren't already
        // This is crucial if district_cds in DB are numeric arrays but need to be handled as text later
        districtsFromCategory = result.rows[0].district_cds.map(String);
      }
    }

    const queryParams = [];
    let whereClauseConditions = [];
    let paramIndex = 1;

    // Add district filter if districts were obtained from depot/division
    if (districtsFromCategory.length > 0) {
      // Cast sc.district_cd to text for comparison with array of text
      whereClauseConditions.push(`sc.district_cd::text = ANY($${paramIndex})`);
      queryParams.push(districtsFromCategory);
      paramIndex++;
    }

    // --- Step 2: Validate class_level ---
    const allowedClassLevels = Array.from({ length: 12 }, (_, i) =>
      (i + 1).toString()
    );
    if (class_level && !allowedClassLevels.includes(String(class_level))) {
      return res.status(400).json({
        success: false,
        message: "Invalid class_level. Use 1-12 as string.",
      });
    }

    // --- Step 3: Determine total students expression ---
    const totalStudentsExpression = class_level
      ? `SUM(sc.class_${String(class_level)})::bigint AS total_students`
      : `SUM(
          sc.class_1 + sc.class_2 + sc.class_3 + sc.class_4 + sc.class_5 +
          sc.class_6 + sc.class_7 + sc.class_8 + sc.class_9 + sc.class_10
        )::bigint AS total_students`;

    const totalSchoolsExpression = `COUNT(DISTINCT sc.school_udise_code)::bigint AS total_schools`;

    // --- Step 4: Apply school type filter (if 'filter' is provided) ---
    const schoolTypeMap = {
      high: 2,
      private: 3,
      aatmanand: 1,
      pm_shree: 4,
    };

    if (filter && schoolTypeMap[filter.toLowerCase()] !== undefined) {
      whereClauseConditions.push(`sc.tbc_school_type = $${paramIndex}`);
      queryParams.push(schoolTypeMap[filter.toLowerCase()]);
      paramIndex++;
    }

    // --- Step 5: Construct the main query ---
    const whereClause = whereClauseConditions.length
      ? `WHERE ${whereClauseConditions.join(" AND ")}`
      : "";

    let query;
    if (category === "districts") {
      query = `
        SELECT
          md.district_name as category_name,
          md.district_cd::text as category_id, -- Cast md.district_cd to text
          ${totalStudentsExpression},
          ${totalSchoolsExpression}
        FROM
          student_counts sc
        JOIN
          mst_district md ON sc.district_cd::text = md.district_cd::text -- Cast both sides to text
        ${whereClause}
        GROUP BY
          md.district_name, md.district_cd
        ORDER BY
          md.district_name;
      `;
    } else {
      query = `
        SELECT
          d.${categoryNameField} as category_name,
          sc.district_cd::text, -- Ensure district_cd is text in the result
          ${totalStudentsExpression},
          ${totalSchoolsExpression}
        FROM
          student_counts sc
        JOIN
          ${categoryTable} d ON sc.district_cd::text = ANY(d.district_cds::text[]) -- Cast both sides to text array
        ${whereClause}
        GROUP BY
          d.${categoryNameField}, sc.district_cd
        ORDER BY
          d.${categoryNameField}, sc.district_cd;
      `;
    }

    const result = await pool.query(query, queryParams);

    // --- Step 6: Format the response data ---
    const formatResponse = (rows, currentCategory, districtNameLookup) => {
      const grouped = {};

      rows.forEach((row) => {
        const categoryName = row.category_name;
        const categoryIdentifier = row.category_id || row.category_name; // Use category_id for districts, otherwise categoryName

        if (!grouped[categoryIdentifier]) {
          grouped[categoryIdentifier] = {
            total_students: 0,
            total_schools: 0,
          };
          if (currentCategory === "districts") {
            grouped[categoryIdentifier].district_name = categoryName;
            grouped[categoryIdentifier].district_id = row.category_id;
          } else {
            grouped[categoryIdentifier].depot_name = categoryName; // Or division_name
            grouped[categoryIdentifier].district_cds = []; // Initialize as an array of objects
          }
        }

        if (currentCategory !== "districts") {
          const districtCd = row.district_cd;
          const districtName = districtNameLookup.get(districtCd) || `Unknown District (${districtCd})`;
          // Check if this district_cd (object form) is already in the array
          if (!grouped[categoryIdentifier].district_cds.some(d => d.id === districtCd)) {
             grouped[categoryIdentifier].district_cds.push({
               id: districtCd,
               name: districtName
             });
           }
        }

        grouped[categoryIdentifier].total_students += Number(row.total_students || 0);
        grouped[categoryIdentifier].total_schools += Number(row.total_schools || 0);
      });

      return Object.values(grouped).map((item) => {
        const formattedItem = {
          ...item,
          total_students: String(item.total_students),
          total_schools: String(item.total_schools),
        };
        // Clean up properties based on category
        if (currentCategory === "districts") {
          delete formattedItem.district_cds; // Ensure this is not present for district category
          delete formattedItem.depot_name;
        } else {
          delete formattedItem.district_name; // Ensure these are not present for depot/division category
          delete formattedItem.district_id;
        }
        return formattedItem;
      });
    };

    const response = formatResponse(result.rows, category, districtLookup);
    const totalStudents = response.reduce(
      (sum, item) => sum + Number(item.total_students), 0
    );
    const totalSchools = response.reduce(
      (sum, item) => sum + Number(item.total_schools), 0
    );

    res.status(200).json({
      success: true,
      message: `${category} wise student and school counts fetched successfully`,
      total_students: String(totalStudents),
      total_schools: String(totalSchools),
      data: response,
    });
  } catch (err) {
    console.error("Error fetching depot/division/district-wise counts:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

const scannedBooksCount = async (req, res) => {
  const { district_cd, block_cd, cluster_cd, subject_id, class_level } =
    req.body;

  try {
    const values = [];
    let whereClauses = ["tbt.scanned_yn = TRUE"];

    // Join mst_schools and mst_subjects
    const joins = `
      INNER JOIN mst_schools ms ON tbt.udise_code = ms.udise_sch_code
      LEFT JOIN mst_subjects subj ON tbt.subject_id = subj.id
    `;

    // Add filters conditionally
    if (district_cd) {
      values.push(district_cd);
      whereClauses.push(`ms.district_cd = $${values.length}`);
    }

    if (block_cd) {
      values.push(block_cd);
      whereClauses.push(`ms.block_cd = $${values.length}`);
    }

    if (cluster_cd) {
      values.push(cluster_cd);
      whereClauses.push(`ms.cluster_cd = $${values.length}`);
    }

    if (subject_id) {
      values.push(subject_id);
      whereClauses.push(`tbt.subject_id = $${values.length}`);
    }

    if (class_level) {
      values.push(class_level);
      whereClauses.push(`subj.class_level = $${values.length}`);
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const query = `
      SELECT COUNT(*) AS scanned_count
      FROM tbc_book_tracking tbt
      ${joins}
      ${whereSQL}
    `;

    const result = await pool.query(query, values);
    const count = parseInt(result.rows[0].scanned_count, 10);

    res.status(200).json({
      status: "success",
      message: "Filtered scanned book count retrieved successfully.",
      data: { scanned_count: count },
    });
  } catch (error) {
    console.error("Error executing scanned-count query:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve scanned book count.",
      error: error.message,
    });
  }
};

const getSubjectByUdise= async (req, res) => {
  try {
    const { udise_sch_code } = req.body;

    if (!udise_sch_code) {
      return res.status(400).json({ message: "udise_sch_code is required" });
    }

    // Step 1: Get sector_id from vtp_student_data
    const sectorQuery = await pool.query(
      `SELECT sector_id FROM public.vtp_student_data WHERE udise_sch_code = $1`,
      [udise_sch_code]
    );

    if (sectorQuery.rows.length === 0) {
      return res.status(404).json({ message: "School not found or sector_id missing" });
    }

    const { sector_id } = sectorQuery.rows[0];

    // Step 2: Fetch subjects related to sector_id
    const subjectQuery = await pool.query(
      `SELECT * FROM public.mst_subjects WHERE sector_id = $1`,
      [sector_id]
    );

    return res.status(200).json({
      sector_id,
      data: subjectQuery.rows,
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }};

module.exports = {
  getPrivateSchoolsByDepot,
  getHighSchoolByDepot,
  getHighSchoolsByUdise,
  createBookDistribution,
  getStudentCounts,
  studentCountDepotWise,
  getSchoolByCluster,
  getClusterWiseSchools,
  scannedBooksCount,
  getSubjectByUdise
  // getAllSchoolList
};
