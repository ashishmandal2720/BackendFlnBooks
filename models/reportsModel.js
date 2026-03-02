const { pool } = require("../config/db");

const getDepotList = async () => {
  const query = `
    SELECT 
      id, 
      depot_cd, 
      depot_name, 
      depot_manager, 
      district_cds 
    FROM public.mst_depot 
    ORDER BY depot_name ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};
const getCardCounts = async () => {
  const query = `
WITH total_books AS (
         SELECT sum(tbc_book_assignments.quantity) AS total_book_prints FROM tbc_book_assignments
        ), 
        school_data AS (
        SELECT DISTINCT ms.udise_sch_code AS udise_code
        FROM mst_schools ms
      ),
        school_count AS (
         SELECT COUNT(DISTINCT udise_sch_code) AS total_schools FROM mst_schools
        ), total_students AS (
        SELECT
  SUM(
    COALESCE(cls1t, 0) + COALESCE(cls2t, 0) + COALESCE(cls3t, 0) + COALESCE(cls4t, 0) +
    COALESCE(cls5t, 0) + COALESCE(cls6t, 0) + COALESCE(cls7t, 0) + COALESCE(cls8t, 0) +
    COALESCE(cls9t, 0) + COALESCE(cls10t, 0) + COALESCE(cls11t, 0) + COALESCE(cls12t, 0)
  ) AS total_students
FROM central_student_counts),
      school_distributed AS (
        SELECT SUM(tscb.received_qty) AS total_school_recieved
        FROM tbc_school_challan_books tscb
        JOIN school_data sd ON tscb.udise_code = sd.udise_code::BIGINT

      ),
      distributed AS (
        SELECT SUM(CAST(tscb.distributed_qty AS INTEGER)) AS total_distributed
        FROM tbc_school_challan_books tscb
        JOIN school_data sd ON tscb.udise_code = sd.udise_code::BIGINT
      ),
      total_scanned AS (
        SELECT COUNT(*) AS total_scanned
        FROM tbc_book_tracking tbt
        JOIN school_data sd ON tbt.udise_code = sd.udise_code::BIGINT
      )
SELECT ts.total_students,sc.total_schools,tb.total_book_prints,
tbs.total_scanned,sd.total_school_recieved,d.total_distributed,
COALESCE(tbs.total_scanned, 0) - COALESCE(d.total_distributed, 0) AS scanned_but_not_distributed
FROM total_students ts, total_books tb, school_count sc,total_scanned tbs,school_distributed sd,distributed d;`;
  const { rows } = await pool.query(query);
  return rows;
};

const getDepotDistrictList = async ({ depot_cd, division_id }) => {
  let districtCodesQuery = "";
  let values = [];

  if (depot_cd) {
    districtCodesQuery = `
      SELECT UNNEST(district_cds) AS district_cd
      FROM public.mst_depot
      WHERE depot_cd = $1
    `;
    values = [depot_cd];
  } else if (division_id) {
    districtCodesQuery = `
      SELECT UNNEST(district_cds) AS district_cd
      FROM public.mst_division
      WHERE division_id = $1
    `;
    values = [division_id];
  } else {
    throw new Error("Either depot_cd or division_id must be provided");
  }

  const { rows: districtCodeRows } = await pool.query(
    districtCodesQuery,
    values
  );
  const districtCodes = districtCodeRows.map((row) => row.district_cd);

  if (districtCodes.length === 0) return [];

  const districtQuery = `
    SELECT district_cd, district_name 
    FROM public.mst_district 
    WHERE district_cd = ANY($1)
    ORDER BY district_name ASC;
  `;
  const { rows: districtDetails } = await pool.query(districtQuery, [
    districtCodes,
  ]);

  return districtDetails;
};

const fetchStudentBookDistributionReport = async (filters) => {
  try {
    const { division_id, depot_id, district, block, cluster, school_type } =
      filters;

    const whereClauses = [];
    const values = [];

    const schoolTypeMap = {
      high: 2,
      private: 3,
      aatmanand: 1,
      pm_shree: 4,
    };

    // Filters on student_counts table
    if (division_id) {
      whereClauses.push(`TRIM(sc.district_cd)::INTEGER = ANY (
        SELECT unnest(district_cds::int[]) FROM mst_division WHERE division_id = $${
          values.length + 1
        }
      )`);
      values.push(division_id);
    }

    if (depot_id) {
      whereClauses.push(`TRIM(sc.district_cd)::INTEGER = ANY (
        SELECT unnest(district_cds::int[]) FROM mst_depot WHERE depot_cd = $${
          values.length + 1
        }
      )`);
      values.push(depot_id);
    }

    if (district) {
      whereClauses.push(
        `TRIM(sc.district_cd)::INTEGER = $${values.length + 1}`
      );
      values.push(district);
    }

    if (block) {
      whereClauses.push(`TRIM(sc.block_cd)::INTEGER = $${values.length + 1}`);
      values.push(block);
    }

    if (cluster) {
      whereClauses.push(`TRIM(sc.cluster_cd)::INTEGER = $${values.length + 1}`);
      values.push(cluster);
    }

    if (school_type && Number.isInteger(schoolTypeMap[school_type])) {
      whereClauses.push(`sc.tbc_school_type = $${values.length + 1}`);
      values.push(schoolTypeMap[school_type]);
    }

    const schoolDataFilterClause =
      whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";
    const query = `
WITH school_data AS (
  SELECT DISTINCT udise_code
  FROM (
    SELECT udise_code FROM tbc_school_challan_books 
    UNION
    SELECT udise_code FROM tbc_book_tracking
  ) AS combined
  JOIN student_counts sc ON combined.udise_code = sc.school_udise_code
  WHERE udise_code IS NOT NULL AND udise_code > 0 ${schoolDataFilterClause}
),
school_distributed AS (
  SELECT COALESCE(SUM(tscb.received_qty), 0) AS total
  FROM tbc_school_challan_books tscb
  JOIN school_data sd ON tscb.udise_code = sd.udise_code
),
distributed AS (
  SELECT COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total
  FROM tbc_school_challan_books tscb
  JOIN school_data sd ON tscb.udise_code = sd.udise_code
),
total_scanned AS (
  SELECT COALESCE(COUNT(*), 0) AS total
  FROM tbc_book_tracking tbt
  JOIN school_data sd ON tbt.udise_code = sd.udise_code
),
total_schools AS (
  SELECT COUNT(DISTINCT sc.school_udise_code) AS total
  FROM student_counts sc
  WHERE sc.school_udise_code IS NOT NULL AND sc.school_udise_code > 0
  ${schoolDataFilterClause}
),
total_students AS (
  SELECT COALESCE(SUM(sc.total_students), 0) AS total
  FROM student_counts sc
  WHERE sc.school_udise_code IS NOT NULL AND sc.school_udise_code > 0
  ${schoolDataFilterClause}
)
SELECT
  sd.total AS school_distributed,
  d.total AS student_distributed,
  ts.total AS total_scanned,
  (ts.total - d.total) AS scanned_but_not_distributed,
  (sd.total - ts.total) AS not_scanned,
  tschool.total AS total_schools,
  tstudent.total AS total_students
FROM school_distributed sd, distributed d, total_scanned ts,
     total_schools tschool, total_students tstudent;
`;

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error in fetchStudentBookDistributionReport:", error);
    throw error;
  }
};

// const BookDistributionReportDetails = async (filters) => {
//   try {
//     const {
//       division_id,
//       depot_id,
//       district,
//       block,
//       cluster,
//       school_type,
//       udise_code,
//       class_level,
//       subject,
//       category = 'depot', // Default category for overall grouping if no granular filter implies another
//     } = filters;

//     const whereClauses = [];
//     const values = [];

//     const schoolTypeMap = {
//       high: 2,
//       private: 3,
//       aatmanand: 1,
//       pm_shree: 4,
//     };

//     // --- Determine the effective category for grouping based on the most granular filter provided ---
//     let effectiveCategory = 'default'; // Default to overall summary

//     // Determine the most granular breakdown level based on filters provided
//     if (udise_code) {
//       effectiveCategory = 'school';
//     } else if (cluster && cluster !== 'all') {
//       effectiveCategory = 'school'; // Specific cluster, show schools within it
//     } else if (block && block !== 'all') {
//       effectiveCategory = 'cluster'; // Specific block, show clusters within it
//     } else if (district && district !== 'all') {
//       effectiveCategory = 'block'; // Specific district, show blocks within it
//     } else if (cluster === 'all') {
//       effectiveCategory = 'cluster';
//     } else if (block === 'all') {
//       effectiveCategory = 'block';
//     } else if (district === 'all') {
//       effectiveCategory = 'district';
//     } else if (division_id || depot_id) { // If only division/depot filter, default to district breakdown
//       effectiveCategory = 'district';
//     } else { // Fallback to user-specified category (depot/division) or overall summary
//       effectiveCategory = category;
//     }

//     // --- School-level Filters (applied to public.student_counts) ---
//     if (division_id) {
//       whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
//         SELECT unnest(district_cds::bigint[]) FROM public.mst_division WHERE division_id = $${
//           values.length + 1
//         }
//       )`);
//       values.push(division_id);
//     }

//     if (depot_id) {
//       whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
//         SELECT unnest(district_cds::bigint[]) FROM public.mst_depot WHERE depot_cd = $${
//           values.length + 1
//         }
//       )`);
//       values.push(depot_id);
//     }

//     // Handle 'all' for district filter: if 'all', don't add district filter
//     if (district && district !== 'all') {
//       whereClauses.push(
//         `TRIM(sc.district_cd)::BIGINT = $${values.length + 1}`
//       );
//       values.push(district);
//     }

//     // Handle 'all' for block filter: if 'all', don't add block filter
//     if (block && block !== 'all') {
//       whereClauses.push(`TRIM(sc.block_cd)::BIGINT = $${values.length + 1}`);
//       values.push(block);
//     }

//     // Handle 'all' for cluster filter: if 'all', don't add cluster filter
//     if (cluster && cluster !== 'all') {
//       whereClauses.push(`TRIM(sc.cluster_cd)::BIGINT = $${values.length + 1}`);
//       values.push(cluster);
//     }

//     if (school_type && Number.isInteger(schoolTypeMap[school_type])) {
//       whereClauses.push(`sc.tbc_school_type = $${values.length + 1}`);
//       values.push(schoolTypeMap[school_type]);
//     }

//     if (udise_code) {
//       whereClauses.push(`sc.school_udise_code = $${values.length + 1}`);
//       values.push(udise_code);
//     }

//     // Filter by class_level (e.g., schools having students in Class 5)
//     if (class_level && typeof class_level === 'number' && class_level >= 1 && class_level <= 10) {
//       whereClauses.push(`sc.class_${class_level} > 0`);
//     }

//     const schoolDataFilterClause =
//       whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";

//     // --- Subject Filter (applied to book-related CTEs) ---
//     let subjectJoinBooks = '';
//     let subjectFilterChallan = '';
//     let subjectFilterTracking = '';

//     if (subject) {
//       // For tbc_school_challan_books, we need to join with tbc_books to filter by subject
//       subjectJoinBooks = `JOIN public.tbc_books tb ON tscb.book_id = tb.id`;
//       // The subject value will be the next parameter in the 'values' array
//       subjectFilterChallan = `AND tb.subject_id = $${values.length + 1}`;
//       subjectFilterTracking = `AND tbt.subject_id = $${values.length + 1}`;
//       values.push(subject); // Add subject value to the parameters
//     }

//     // --- Dynamic SELECT, GROUP BY, and JOIN clauses based on effectiveCategory ---
//     let selectGroupByCols = '';
//     let groupByClause = '';
//     let masterTableJoins = []; // Changed to an array for multiple joins
//     let orderByClause = '';

//     switch (effectiveCategory) {
//       case 'depot':
//         selectGroupByCols = 'md.depot_cd, md.depot_name';
//         groupByClause = 'GROUP BY md.depot_cd, md.depot_name';
//         masterTableJoins.push(`JOIN public.mst_depot md ON TRIM(fs.district_cd)::BIGINT = ANY (md.district_cds::bigint[])`);
//         orderByClause = 'md.depot_name';
//         break;
//       case 'division':
//         selectGroupByCols = 'mdiv.division_id, mdiv.division_name';
//         groupByClause = 'GROUP BY mdiv.division_id, mdiv.division_name';
//         masterTableJoins.push(`LEFT JOIN public.mst_division mdiv ON TRIM(fs.district_cd)::BIGINT = ANY (mdiv.district_cds::bigint[])`);
//         orderByClause = 'mdiv.division_name';
//         break;
//       case 'district':
//         selectGroupByCols = 'TRIM(fs.district_cd)::BIGINT AS district_cd, mdist.district_name';
//         groupByClause = 'GROUP BY TRIM(fs.district_cd)::BIGINT, mdist.district_name';
//         masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//         orderByClause = 'mdist.district_name';
//         break;
//       case 'block':
//         selectGroupByCols = 'TRIM(fs.block_cd)::BIGINT AS block_cd, mb.block_name';
//         groupByClause = 'GROUP BY TRIM(fs.block_cd)::BIGINT, mb.block_name';
//         // Need to join district first to get block_cd correctly linked if not already filtered
//         masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//         masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
//         orderByClause = 'mb.block_name';
//         break;
//       case 'cluster':
//         selectGroupByCols = 'TRIM(fs.cluster_cd)::BIGINT AS cluster_cd, mcl.cluster_name';
//         groupByClause = 'GROUP BY TRIM(fs.cluster_cd)::BIGINT, mcl.cluster_name';
//         // Need to join district and block first
//         masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//         masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
//         masterTableJoins.push(`LEFT JOIN public.mst_cluster mcl ON TRIM(fs.cluster_cd)::BIGINT = mcl.cluster_cd`);
//         orderByClause = 'mcl.cluster_name';
//         break;
//       case 'school': // Breakdown by individual UDISE school code
//       case 'udiseid': // Alias for school
//         selectGroupByCols = 'fs.school_udise_code, fs.school_name'; // Assuming school_name is available in student_counts
//         groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
//         orderByClause = 'fs.school_udise_code';
//         break;
//       default: // Overall summary (no grouping)
//         selectGroupByCols = '';
//         groupByClause = '';
//         masterTableJoins = [];
//         orderByClause = '';
//         break;
//     }

//     const query = `
//       WITH filtered_schools AS (
//         -- This CTE identifies all unique schools that match the input filters
//       SELECT DISTINCT ON (sc.school_udise_code)
//       sc.school_udise_code,
//             sc.district_cd,
//             sc.block_cd,
//             sc.cluster_cd,
//             sc.tbc_school_type,
//             sc.total_students, -- Include total_students for later aggregation
//             sc.school_name -- Include school_name for 'school' category breakdown
//         FROM public.student_counts sc
//         WHERE sc.school_udise_code IS NOT NULL AND sc.school_udise_code > 0
//         ${schoolDataFilterClause}
//       ),
//       school_distributed_agg AS (
//         -- Aggregate received quantity per UDISE code for filtered schools
//         SELECT
//             tscb.udise_code,
//             COALESCE(SUM(tscb.received_qty), 0) AS total_received
//         FROM public.tbc_school_challan_books tscb
//         ${subjectJoinBooks} -- Conditionally join tbc_books for subject filter
//         JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//         WHERE tscb.udise_code IS NOT NULL -- Base WHERE clause
//         ${subjectFilterChallan} -- Apply subject filter if present
//         GROUP BY tscb.udise_code
//       ),
//       distributed_agg AS (
//         -- Aggregate distributed quantity per UDISE code for filtered schools
//         SELECT
//             tscb.udise_code,
//             COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
//         FROM public.tbc_school_challan_books tscb
//         ${subjectJoinBooks} -- Conditionally join tbc_books for subject filter
//         JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//         WHERE tscb.udise_code IS NOT NULL -- Base WHERE clause
//         ${subjectFilterChallan} -- Apply subject filter if present
//         GROUP BY tscb.udise_code
//       ),
//       scanned_agg AS (
//         -- Aggregate scanned count per UDISE code for filtered schools
//         SELECT
//             tbt.udise_code,
//             COALESCE(COUNT(*), 0) AS total_scanned
//         FROM public.tbc_book_tracking tbt
//         JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
//         WHERE tbt.udise_code IS NOT NULL -- Base WHERE clause
//         ${subjectFilterTracking} -- Apply subject filter if present
//         GROUP BY tbt.udise_code
//       )
//       -- Final SELECT to combine all data and apply the dynamic GROUP BY
//       SELECT
//           ${selectGroupByCols ? `${selectGroupByCols},` : ''}
//           COALESCE(SUM(sda.total_received), 0) AS school_distributed,
//           COALESCE(SUM(da.total_distributed), 0) AS student_distributed,
//           COALESCE(SUM(sa.total_scanned), 0) AS total_scanned,
//           COALESCE(SUM(sa.total_scanned), 0) - COALESCE(SUM(da.total_distributed), 0) AS scanned_but_not_distributed,
//           COALESCE(SUM(sda.total_received), 0) - COALESCE(SUM(sa.total_scanned), 0) AS not_scanned,
//           COUNT(fs.school_udise_code) AS total_schools, -- Count unique schools from filtered set
//           COALESCE(SUM(fs.total_students), 0) AS total_students
//       FROM filtered_schools fs
//       ${masterTableJoins.join(' ')} -- Dynamically join master tables for names (e.g., mst_depot, mst_division, mst_districts, etc.)
//       LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
//       LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
//       LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code
//       ${groupByClause}
//       ${orderByClause ? `ORDER BY ${orderByClause}` : ''};
//     `;

//     const result = await pool.query(query, values);
//     let responseData = result.rows;
//     let finalResponse;

//     if (effectiveCategory !== 'default' && responseData.length > 0) {
//         // Calculate grand totals across all grouped rows
//         const totalSummary = responseData.reduce((acc, current) => {
//             acc.school_distributed = (acc.school_distributed || 0) + parseInt(current.school_distributed);
//             acc.student_distributed = (acc.student_distributed || 0) + parseInt(current.student_distributed);
//             acc.total_scanned = (acc.total_scanned || 0) + parseInt(current.total_scanned);
//             acc.scanned_but_not_distributed = (acc.scanned_but_not_distributed || 0) + parseInt(current.scanned_but_not_distributed);
//             acc.not_scanned = (acc.not_scanned || 0) + parseInt(current.not_scanned);
//             acc.total_schools = (acc.total_schools || 0) + parseInt(current.total_schools);
//             acc.total_students = (acc.total_students || 0) + parseInt(current.total_students);
//             return acc;
//         }, {});
//         finalResponse = { total: totalSummary, data: responseData };
//     } else if (effectiveCategory === 'default' && responseData.length > 0) {
//         // If default category, it's already a single row, return it directly
//         finalResponse = responseData[0];
//     } else {
//         // No data found, return zeros for all fields
//         finalResponse = {
          
//             school_distributed: 0,
//             student_distributed: 0,
//             total_scanned: 0,
//             scanned_but_not_distributed: 0,
//             not_scanned: 0,
//             total_schools: 0,
//             total_students: 0
//         };
//     }

//     return finalResponse;

//   } catch (error) {
//     console.error("Error in BookDistributionReportDetails:", error);
//     throw error;
//   }
// };


// const BookDistributionReportDetails = async (filters) => {
//     try {
//         const {
//             division_id,
//             depot_id,
//             district,
//             block,
//             cluster,
//             school_type,
//             udise_code,
//             class_level,
//             subject,
//             medium,
//             category = 'depot',
//         } = filters;

//         const whereClauses = [];
//         const values = [];

//         const schoolTypeMap = {
//             high: 2,
//             private: 3,
//             aatmanand: 1,
//             pm_shree: 4,
//         };

//         // Determine effective category
//         let effectiveCategory = 'default';
//         if (udise_code && class_level) {
//             effectiveCategory = 'subject_breakdown';
//         } else if (udise_code) {
//             effectiveCategory = 'school_classes_all';
//         } else if (cluster && cluster !== 'all') {
//             effectiveCategory = 'school';
//         } else if (block && block !== 'all') {
//             effectiveCategory = 'cluster';
//         } else if (district && district !== 'all') {
//             effectiveCategory = 'block';
//         } else if (cluster === 'all') {
//             effectiveCategory = 'cluster';
//         } else if (block === 'all') {
//             effectiveCategory = 'block';
//         } else if (district === 'all') {
//             effectiveCategory = 'district';
//         } else if (division_id || depot_id) {
//             effectiveCategory = 'district'; // This was previously 'district', keeping it for consistency
//         } else {
//             effectiveCategory = category;
//         }

//         // School-level filters
//         if (division_id) {
//             whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
//                 SELECT unnest(district_cds::bigint[]) FROM public.mst_division WHERE division_id = $${
//                 values.length + 1
//                 }
//             )`);
//             values.push(division_id);
//         }

//         if (depot_id) {
//             whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
//                 SELECT unnest(district_cds::bigint[]) FROM public.mst_depot WHERE depot_cd = $${
//                 values.length + 1
//                 }
//             )`);
//             values.push(depot_id);
//         }

//         if (district && district !== 'all') {
//             whereClauses.push(
//                 `TRIM(sc.district_cd)::BIGINT = $${values.length + 1}`
//             );
//             values.push(district);
//         }

//         if (block && block !== 'all') {
//             whereClauses.push(`TRIM(sc.block_cd)::BIGINT = $${values.length + 1}`);
//             values.push(block);
//         }

//         if (cluster && cluster !== 'all') {
//             whereClauses.push(`TRIM(sc.cluster_cd)::BIGINT = $${values.length + 1}`);
//             values.push(cluster);
//         }

//         if (school_type && Number.isInteger(schoolTypeMap[school_type])) {
//             whereClauses.push(`sc.tbc_school_type = $${values.length + 1}`);
//             values.push(schoolTypeMap[school_type]);
//         }

//         if (udise_code) {
//             whereClauses.push(`sc.school_udise_code = $${values.length + 1}`);
//             values.push(udise_code);
//         }

    
//         const schoolDataFilterClause =
//             whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";
//         let bookTableJoin = '';
//         let bookLevelFilters = '';
//         let subjectFilterChallan = '';
//         let subjectFilterTracking = '';

//         if (effectiveCategory === 'subject_breakdown' || effectiveCategory === 'class_level_specific') {
//             bookTableJoin = `JOIN public.tbc_books tb ON tscb.book_id = tb.id`;

//             if (class_level && class_level >= 1 && class_level <= 10) {
//                 bookLevelFilters += ` AND tb.class_level = $${values.length + 1}`;
//                 values.push(class_level);
//             }
//             if (medium) {
//                 bookLevelFilters += ` AND tb.medium = $${values.length + 1}`;
//                 values.push(medium);
//             }
//         }

//         if (subject) {
//             subjectFilterChallan = ` AND tb.subject_id = $${values.length + 1}`;
//             subjectFilterTracking = ` AND tbt.subject_id = $${values.length + 1}`;
//             values.push(subject);
//         }

//         // Dynamic SELECT, GROUP BY, and JOIN clauses
//         let selectGroupByCols = '';
//         let groupByClause = '';
//         let masterTableJoins = [];
//         let orderByClause = '';
//         let finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,'; // Default to count distinct schools

//         switch (effectiveCategory) {
//             case 'depot':
//                 selectGroupByCols = 'md.depot_cd, md.depot_name';
//                 groupByClause = 'GROUP BY md.depot_cd, md.depot_name';
//                 masterTableJoins.push(`JOIN public.mst_depot md ON TRIM(fs.district_cd)::BIGINT = ANY (md.district_cds::bigint[])`);
//                 orderByClause = 'md.depot_name';
//                 break;
//             case 'division':
//                 selectGroupByCols = 'mdiv.division_id, mdiv.division_name';
//                 groupByClause = 'GROUP BY mdiv.division_id, mdiv.division_name';
//                 masterTableJoins.push(`LEFT JOIN public.mst_division mdiv ON TRIM(fs.district_cd)::BIGINT = ANY (mdiv.district_cds::bigint[])`);
//                 orderByClause = 'mdiv.division_name';
//                 break;
//             case 'district':
//                 selectGroupByCols = 'TRIM(fs.district_cd)::BIGINT AS district_cd, mdist.district_name';
//                 groupByClause = 'GROUP BY TRIM(fs.district_cd)::BIGINT, mdist.district_name';
//                 masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//                 orderByClause = 'mdist.district_name';
//                 break;
//             case 'block':
//                 selectGroupByCols = 'TRIM(fs.block_cd)::BIGINT AS block_cd, mb.block_name';
//                 groupByClause = 'GROUP BY TRIM(fs.block_cd)::BIGINT, mb.block_name';
//                 masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//                 masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
//                 orderByClause = 'mb.block_name';
//                 break;
//             case 'cluster':
//                 selectGroupByCols = 'TRIM(fs.cluster_cd)::BIGINT AS cluster_cd, mcl.cluster_name';
//                 groupByClause = 'GROUP BY TRIM(fs.cluster_cd)::BIGINT, mcl.cluster_name';
//                 masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
//                 masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
//                 masterTableJoins.push(`LEFT JOIN public.mst_cluster mcl ON TRIM(fs.block_cd)::BIGINT = mcl.block_cd`)
//                 orderByClause = 'mcl.cluster_name';
//                 break;
//             case 'school':
//                 selectGroupByCols = 'fs.school_udise_code, fs.school_name';
//                 groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
//                 orderByClause = 'fs.school_udise_code';
//                 // For 'school' category, total_schools is always 1 for each row returned
//                 finalSelectTotalSchools = '1 AS total_schools,'; 
//                 break;
//             case 'school_classes_all':
//             case 'class_level_specific':
//                 selectGroupByCols = `fs.school_udise_code, fs.school_name,
//                                      SUM(fs.class_1) AS class_1_students,
//                                      SUM(fs.class_2) AS class_2_students,
//                                      SUM(fs.class_3) AS class_3_students,
//                                      SUM(fs.class_4) AS class_4_students,
//                                      SUM(fs.class_5) AS class_5_students,
//                                      SUM(fs.class_6) AS class_6_students,
//                                      SUM(fs.class_7) AS class_7_students,
//                                      SUM(fs.class_8) AS class_8_students,
//                                      SUM(fs.class_9) AS class_9_students,
//                                      SUM(fs.class_10) AS class_10_students`;
//                 groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
//                 orderByClause = 'fs.school_udise_code';
//                 // For these categories, total_schools is 1 for each row returned as it's school-specific
//                 finalSelectTotalSchools = '1 AS total_schools,';
//                 break;
//             case 'subject_breakdown':
//                 selectGroupByCols = `ms.name AS subject_name, 
//                                      fs.school_udise_code, 
//                                      fs.school_name,
//                                      fs.class_${class_level} AS total_students`;
//                 groupByClause = `GROUP BY ms.name, fs.school_udise_code, fs.school_name, fs.class_${class_level}`;
//                 orderByClause = `ms.name`;
//                 // For subject_breakdown, total_schools is 1 per subject per school
//                 finalSelectTotalSchools = '1 AS total_schools,';
//                 break;
//             default:
//                 // This 'default' case should probably aggregate total_schools similar to 'depot'
//                 selectGroupByCols = ''; // Or whatever makes sense for a 'default' overview (e.g., state-level)
//                 groupByClause = '';
//                 masterTableJoins = [];
//                 orderByClause = '';
//                 finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//                 break;
//         }

//         // Main query
//         const query = `
//             WITH filtered_schools AS (
//                 SELECT DISTINCT ON (sc.school_udise_code)
//                     sc.school_udise_code,
//                     sc.district_cd,
//                     sc.block_cd,
//                     sc.cluster_cd,
//                     sc.tbc_school_type,
//                     sc.total_students,
//                     sc.school_name,
//                     sc.class_1, sc.class_2, sc.class_3, sc.class_4, sc.class_5,
//                     sc.class_6, sc.class_7, sc.class_8, sc.class_9, sc.class_10
//                 FROM public.student_counts sc
//                 WHERE sc.school_udise_code IS NOT NULL 
//                     AND sc.school_udise_code > 0
//                     ${schoolDataFilterClause}
//             )
//             ${effectiveCategory === 'subject_breakdown' ? `, subjects_for_school AS (
//                 SELECT DISTINCT tb.subject_id
//                 FROM public.tbc_books tb
//                 WHERE 1=1 ${bookLevelFilters}
//             )` : ''}
//             , school_distributed_agg AS (
//                 SELECT
//                     tscb.udise_code,
//                     ${effectiveCategory === 'subject_breakdown' ? 'tb.subject_id,' : ''}
//                     COALESCE(SUM(tscb.received_qty), 0) AS total_received
//                 FROM public.tbc_school_challan_books tscb
//                 ${bookTableJoin}
//                 JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//                 WHERE tscb.udise_code IS NOT NULL
//                     ${subjectFilterChallan}
//                     ${bookLevelFilters}
//                 GROUP BY tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tb.subject_id' : ''}
//             )
//             , distributed_agg AS (
//                 SELECT
//                     tscb.udise_code,
//                     ${effectiveCategory === 'subject_breakdown' ? 'tb.subject_id,' : ''}
//                     COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
//                 FROM public.tbc_school_challan_books tscb
//                 ${bookTableJoin}
//                 JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//                 WHERE tscb.udise_code IS NOT NULL
//                     ${subjectFilterChallan}
//                     ${bookLevelFilters}
//                 GROUP BY tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tb.subject_id' : ''}
//             )
//             , scanned_agg AS (
//                 SELECT
//                     tbt.udise_code,
//                     ${effectiveCategory === 'subject_breakdown' ? 'tbt.subject_id,' : ''}
//                     COALESCE(COUNT(*), 0) AS total_scanned
//                 FROM public.tbc_book_tracking tbt
//                 ${bookTableJoin ? bookTableJoin.replace('tscb.book_id', 'tbt.book_id') : ''}
//                 JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
//                 WHERE tbt.udise_code IS NOT NULL
//                     ${subjectFilterTracking}
//                     ${bookLevelFilters}
//                 GROUP BY tbt.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tbt.subject_id' : ''}
//             )
//             SELECT
//                 ${selectGroupByCols ? `${selectGroupByCols},` : ''}
//                 COALESCE(SUM(sda.total_received), 0) AS school_distributed,
//                 COALESCE(SUM(da.total_distributed), 0) AS student_distributed,
//                 COALESCE(SUM(sa.total_scanned), 0) AS total_scanned,
//                 COALESCE(SUM(sa.total_scanned), 0) - COALESCE(SUM(da.total_distributed), 0) AS scanned_but_not_distributed,
//                 COALESCE(SUM(sda.total_received), 0) - COALESCE(SUM(sa.total_scanned), 0) AS not_scanned,
//                 ${finalSelectTotalSchools}
//                 COALESCE(SUM(fs.total_students), 0) AS total_students
//             FROM filtered_schools fs
//             ${masterTableJoins.join(' ')}
//             ${
//                 effectiveCategory === 'subject_breakdown' 
//                     ? `CROSS JOIN subjects_for_school sfs
//                         LEFT JOIN school_distributed_agg sda 
//                             ON fs.school_udise_code = sda.udise_code 
//                             AND sfs.subject_id = sda.subject_id
//                         LEFT JOIN distributed_agg da 
//                             ON fs.school_udise_code = da.udise_code 
//                             AND sfs.subject_id = da.subject_id
//                         LEFT JOIN scanned_agg sa 
//                             ON fs.school_udise_code = sa.udise_code 
//                             AND sfs.subject_id = sa.subject_id
//                         LEFT JOIN public.mst_subjects ms ON sfs.subject_id = ms.id`
//                     : `LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
//                         LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
//                         LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code`
//             }
//             ${groupByClause}
//             ${orderByClause ? `ORDER BY ${orderByClause}` : ''};
//         `;

//         const result = await pool.query(query, values);
//         let responseData = result.rows;
//         let finalResponse;

//         // Common function to convert numbers to strings for consistency in totalSummary
//         const convertNumbersToStrings = (obj) => {
//             for (const key in obj) {
//                 if (typeof obj[key] === 'number' && key !== 'school_udise_code') { // Added 'school_udise_code' exclusion
//                     obj[key] = String(obj[key]);
//                 }
//             }
//             return obj;
//         };

//         // Handle different response scenarios
//         if (effectiveCategory === 'school_classes_all' && udise_code) {
//             finalResponse = { data: [], total: {} };
//             if (responseData.length > 0) {
//                 const schoolInfo = responseData[0];
//                 const totalSummary = {
//                     school_distributed: parseInt(schoolInfo.school_distributed),
//                     student_distributed: parseInt(schoolInfo.student_distributed),
//                     total_scanned: parseInt(schoolInfo.total_scanned),
//                     scanned_but_not_distributed: parseInt(schoolInfo.scanned_but_not_distributed),
//                     not_scanned: parseInt(schoolInfo.not_scanned),
//                     total_students: parseInt(schoolInfo.total_students),
//                     total_schools: parseInt(schoolInfo.total_schools) // Added total_schools
//                 };
//                 finalResponse.total = convertNumbersToStrings(totalSummary); // Apply conversion

//                 for (let i = 1; i <= 10; i++) {
//                     const classKey = `class_${i}`;
//                     if (schoolInfo[`${classKey}_students`] > 0) {
//                         finalResponse.data.push({
//                             [`class_${i}`]: {
//                                 "school_udise_code": String(schoolInfo.school_udise_code), // Ensure UDISE code is string
//                                 "school_name": schoolInfo.school_name,
//                                 "school_distributed": String(parseInt(schoolInfo.school_distributed)),
//                                 "student_distributed": String(parseInt(schoolInfo.student_distributed)),
//                                 "total_scanned": String(parseInt(schoolInfo.total_scanned)),
//                                 "scanned_but_not_distributed": String(parseInt(schoolInfo.scanned_but_not_distributed)),
//                                 "not_scanned": String(parseInt(schoolInfo.not_scanned)),
//                                 "total_students": String(parseInt(schoolInfo[`${classKey}_students`]))
//                             }
//                         });
//                     }
//                 }
//             } else {
//                 finalResponse = {
//                     data: [],
//                     total: {
//                         school_distributed: 0,
//                         student_distributed: 0,
//                         total_scanned: 0,
//                         scanned_but_not_distributed: 0,
//                         not_scanned: 0,
//                         total_students: 0,
//                         total_schools: 0 // Added total_schools
//                     }
//                 };
//             }
//         }
//         else if (effectiveCategory === 'class_level_specific' && udise_code && class_level) {
//             finalResponse = { data: [], total: {} };
//             if (responseData.length > 0) {
//                 const schoolInfo = responseData[0];
//                 const totalSummary = {
//                     school_distributed: parseInt(schoolInfo.school_distributed),
//                     student_distributed: parseInt(schoolInfo.student_distributed),
//                     total_scanned: parseInt(schoolInfo.total_scanned),
//                     scanned_but_not_distributed: parseInt(schoolInfo.scanned_but_not_distributed),
//                     not_scanned: parseInt(schoolInfo.not_scanned),
//                     total_students: parseInt(schoolInfo[`class_${class_level}_students`]),
//                     total_schools: parseInt(schoolInfo.total_schools) // Added total_schools
//                 };
//                 finalResponse.total = convertNumbersToStrings(totalSummary); // Apply conversion

//                 const classKey = `class_${class_level}`;
//                 if (schoolInfo[`${classKey}_students`] > 0) {
//                     finalResponse.data.push({
//                         [`class_${class_level}`]: {
//                             "school_udise_code": String(schoolInfo.school_udise_code), // Ensure UDISE code is string
//                             "school_name": schoolInfo.school_name,
//                             "school_distributed": String(parseInt(schoolInfo.school_distributed)),
//                             "student_distributed": String(parseInt(schoolInfo.student_distributed)),
//                             "total_scanned": String(parseInt(schoolInfo.total_scanned)),
//                             "scanned_but_not_distributed": String(parseInt(schoolInfo.scanned_but_not_distributed)),
//                             "not_scanned": String(parseInt(schoolInfo.not_scanned)),
//                             "total_students": String(parseInt(schoolInfo[`${classKey}_students`]))
//                         }
//                     });
//                 }
//             } else {
//                 finalResponse = {
//                     data: [],
//                     total: {
//                         school_distributed: 0,
//                         student_distributed: 0,
//                         total_scanned: 0,
//                         scanned_but_not_distributed: 0,
//                         not_scanned: 0,
//                         total_students: 0,
//                         total_schools: 0 // Added total_schools
//                     }
//                 };
//             }
//         }
//         else if (effectiveCategory === 'subject_breakdown' && udise_code && class_level) {
//             finalResponse = { data: [], total: {
//                 school_distributed: 0,
//                 student_distributed: 0,
//                 total_scanned: 0,
//                 scanned_but_not_distributed: 0,
//                 not_scanned: 0,
//                 total_students: 0,
//                 total_schools: 0 // Added total_schools initial value
//             }};

//             responseData.forEach(row => {
//                 finalResponse.total.school_distributed += parseInt(row.school_distributed || 0);
//                 finalResponse.total.student_distributed += parseInt(row.student_distributed || 0);
//                 finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
//                 finalResponse.total.scanned_but_not_distributed += parseInt(row.scanned_but_not_distributed || 0);
//                 finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);
//                 finalResponse.total.total_students = parseInt(row.total_students || 0); // Assuming total_students is the same for all subjects for that school
//                 finalResponse.total.total_schools = parseInt(row.total_schools || 0); // Assuming total_schools is 1 per row for this category, or you sum distinct schools
//                 finalResponse.data.push({
//                     [row.subject_name]: {
//                         school_udise_code: String(row.school_udise_code), // Ensure UDISE code is string
//                         school_name: row.school_name,
//                         school_distributed: String(parseInt(row.school_distributed || 0)),
//                         student_distributed: String(parseInt(row.student_distributed || 0)),
//                         total_scanned: String(parseInt(row.total_scanned || 0)),
//                         scanned_but_not_distributed: String(parseInt(row.scanned_but_not_distributed || 0)),
//                         not_scanned: String(parseInt(row.not_scanned || 0)),
//                         total_students: String(parseInt(row.total_students || 0))
//                     }
//                 });
//             });
           
//             // Convert total values to strings after summing
//             finalResponse.total = convertNumbersToStrings(finalResponse.total);

//         }
//         else if (effectiveCategory !== 'default' && responseData.length > 0) {
//             const totalSummary = responseData.reduce((acc, current) => {
//                 acc.school_distributed = (acc.school_distributed || 0) + parseInt(current.school_distributed || 0);
//                 acc.student_distributed = (acc.student_distributed || 0) + parseInt(current.student_distributed || 0);
//                 acc.total_scanned = (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
//                 acc.scanned_but_not_distributed = (acc.scanned_but_not_distributed || 0) + parseInt(current.scanned_but_not_distributed || 0);
//                 acc.not_scanned = (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
//                 // Ensure total_schools is correctly accumulated
//                 acc.total_schools = (acc.total_schools || 0) + parseInt(current.total_schools || 0); 
//                 acc.total_students = (acc.total_students || 0) + parseInt(current.total_students || 0);
//                 return acc;
//             }, {});
//             finalResponse = { total: convertNumbersToStrings(totalSummary), data: responseData }; // Apply conversion
//         }
//         else if (effectiveCategory === 'default' && responseData.length > 0) {
//             // For the 'default' category, assuming responseData[0] is the summary itself
//             finalResponse = responseData[0];
//             // Ensure total_schools is present and converted to string
//             if (finalResponse.total_schools === undefined) {
//                 finalResponse.total_schools = 0;
//             }
//             finalResponse = convertNumbersToStrings(finalResponse); // Apply conversion to the entire object
//         }
//         else {
//             finalResponse = {
//                 school_distributed: 0,
//                 student_distributed: 0,
//                 total_scanned: 0,
//                 scanned_but_not_distributed: 0,
//                 not_scanned: 0,
//                 total_schools: 0, // Ensure it's explicitly 0 if no data
//                 total_students: 0
//             };
//         }

//         return finalResponse;

//     } catch (error) {
//         console.error("Error in BookDistributionReportDetails:", error);
//         throw error;
//     }
// };

const BookDistributionReportDetails = async (filters) => {
    try {
        const {
            division_id,
            depot_id,
            district,
            block,
            cluster,
            school_type,
            udise_code,
            class_level,
            subject,
            medium,
            category = 'depot',
        } = filters;

        const whereClauses = [];
        const values = [];

        const schoolTypeMap = {
            high: 2,
            private: 3,
            aatmanand: 1,
            pm_shree: 4,
        };

        // Determine effective category
        let effectiveCategory = 'default';
        if (udise_code && class_level) {
            effectiveCategory = 'subject_breakdown';
        } else if (udise_code) {
            effectiveCategory = 'school_classes_all';
        } else if (cluster && cluster !== 'all') {
            effectiveCategory = 'school'; // Output for a specific school
        } else if (block && block !== 'all') {
            effectiveCategory = 'cluster'; // Output grouped by cluster within a block
        } else if (district && district !== 'all') {
            effectiveCategory = 'block'; // Output grouped by block within a district
        } else if (division_id || depot_id) {
            effectiveCategory = 'district'; // Output grouped by district within a division/depot
        } else {
            effectiveCategory = category; // 'depot' by default
        }

        // School-level filters
        if (division_id) {
            whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
                SELECT unnest(district_cds::bigint[]) FROM public.mst_division WHERE division_id = $${
                values.length + 1
                }
            )`);
            values.push(division_id);
        }

        if (depot_id) {
            whereClauses.push(`TRIM(sc.district_cd)::BIGINT = ANY (
                SELECT unnest(district_cds::bigint[]) FROM public.mst_depot WHERE depot_cd = $${
                values.length + 1
                }
            )`);
            values.push(depot_id);
        }

        if (district && district !== 'all') {
            whereClauses.push(
                `TRIM(sc.district_cd)::BIGINT = $${values.length + 1}`
            );
            values.push(district);
        }

        if (block && block !== 'all') {
            whereClauses.push(`TRIM(sc.block_cd)::BIGINT = $${values.length + 1}`);
            values.push(block);
        }

        if (cluster && cluster !== 'all') {
            whereClauses.push(`TRIM(sc.cluster_cd)::BIGINT = $${values.length + 1}`);
            values.push(cluster);
        }

        if (school_type && Number.isInteger(schoolTypeMap[school_type])) {
            whereClauses.push(`sc.tbc_school_type = $${values.length + 1}`);
            values.push(schoolTypeMap[school_type]);
        }

        if (udise_code) {
            whereClauses.push(`sc.school_udise_code = $${values.length + 1}`);
            values.push(udise_code);
        }

    
        const schoolDataFilterClause =
            whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";
        let bookTableJoin = '';
        let bookLevelFilters = '';
        let subjectFilterChallan = '';
        let subjectFilterTracking = '';

        if (effectiveCategory === 'subject_breakdown' || effectiveCategory === 'class_level_specific') {
            bookTableJoin = `JOIN public.tbc_books tb ON tscb.book_id = tb.id`;

            if (class_level && class_level >= 1 && class_level <= 10) {
                bookLevelFilters += ` AND tb.class_level = $${values.length + 1}`;
                values.push(class_level);
            }
            if (medium) {
                bookLevelFilters += ` AND tb.medium = $${values.length + 1}`;
                values.push(medium);
            }
        }

        if (subject) {
            subjectFilterChallan = ` AND tb.subject_id = $${values.length + 1}`;
            subjectFilterTracking = ` AND tbt.subject_id = $${values.length + 1}`;
            values.push(subject);
        }

        // Dynamic SELECT, GROUP BY, and JOIN clauses
        let selectGroupByCols = '';
        let groupByClause = '';
        let masterTableJoins = [];
        let orderByClause = '';
        let finalSelectTotalSchools; 

        switch (effectiveCategory) {
            case 'depot':
                selectGroupByCols = 'md.depot_cd, md.depot_name';
                groupByClause = 'GROUP BY md.depot_cd, md.depot_name';
                masterTableJoins.push(`JOIN public.mst_depot md ON TRIM(fs.district_cd)::BIGINT = ANY (md.district_cds::bigint[])`);
                orderByClause = 'md.depot_name';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
            case 'division':
                selectGroupByCols = 'mdiv.division_id, mdiv.division_name';
                groupByClause = 'GROUP BY mdiv.division_id, mdiv.division_name';
                masterTableJoins.push(`LEFT JOIN public.mst_division mdiv ON TRIM(fs.district_cd)::BIGINT = ANY (mdiv.district_cds::bigint[])`);
                orderByClause = 'mdiv.division_name';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
            case 'district':
                selectGroupByCols = 'TRIM(fs.district_cd)::BIGINT AS district_cd, mdist.district_name';
                groupByClause = 'GROUP BY TRIM(fs.district_cd)::BIGINT, mdist.district_name';
                masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
                orderByClause = 'mdist.district_name';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
            case 'block':
                selectGroupByCols = 'TRIM(fs.block_cd)::BIGINT AS block_cd, mb.block_name';
                groupByClause = 'GROUP BY TRIM(fs.block_cd)::BIGINT, mb.block_name';
                masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
                masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
                orderByClause = 'mb.block_name';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
            case 'cluster':
                selectGroupByCols = 'mcl.cluster_cd, mcl.cluster_name'; // Directly select from mst_cluster
                groupByClause = 'GROUP BY mcl.cluster_cd, mcl.cluster_name'; // Group by mst_cluster columns
                masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON TRIM(fs.district_cd)::BIGINT = mdist.district_cd`);
                masterTableJoins.push(`LEFT JOIN public.mst_block mb ON TRIM(fs.block_cd)::BIGINT = mb.block_cd`);
                // Crucially, join filtered_schools with mst_cluster on their respective cluster codes
                masterTableJoins.push(`INNER JOIN public.mst_cluster mcl ON TRIM(fs.cluster_cd)::BIGINT = mcl.cluster_cd`);
                orderByClause = 'mcl.cluster_name';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
            case 'school':
                selectGroupByCols = 'fs.school_udise_code, fs.school_name';
                groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
                orderByClause = 'fs.school_udise_code';
                finalSelectTotalSchools = '1 AS total_schools,'; 
                break;
            case 'school_classes_all':
            case 'class_level_specific':
                selectGroupByCols = `fs.school_udise_code, fs.school_name,
                                            SUM(fs.class_1) AS class_1_students,
                                            SUM(fs.class_2) AS class_2_students,
                                            SUM(fs.class_3) AS class_3_students,
                                            SUM(fs.class_4) AS class_4_students,
                                            SUM(fs.class_5) AS class_5_students,
                                            SUM(fs.class_6) AS class_6_students,
                                            SUM(fs.class_7) AS class_7_students,
                                            SUM(fs.class_8) AS class_8_students,
                                            SUM(fs.class_9) AS class_9_students,
                                            SUM(fs.class_10) AS class_10_students`;
                groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
                orderByClause = 'fs.school_udise_code';
                finalSelectTotalSchools = '1 AS total_schools,';
                break;
            case 'subject_breakdown':
                selectGroupByCols = `ms.name AS subject_name, 
                                            fs.school_udise_code, 
                                            fs.school_name,
                                            fs.class_${class_level} AS total_students`;
                groupByClause = `GROUP BY ms.name, fs.school_udise_code, fs.school_name, fs.class_${class_level}`;
                orderByClause = `ms.name`;
                finalSelectTotalSchools = '1 AS total_schools,'; 
                break;
            default:
                selectGroupByCols = ''; 
                groupByClause = '';
                masterTableJoins = [];
                orderByClause = '';
                finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
                break;
        }

        // Main query
        const query = `
            WITH filtered_schools AS (
                SELECT DISTINCT ON (sc.school_udise_code)
                    sc.school_udise_code,
                    sc.district_cd,
                    sc.block_cd,
                    sc.cluster_cd,
                    sc.tbc_school_type,
                    sc.total_students,
                    sc.school_name,
                    sc.class_1, sc.class_2, sc.class_3, sc.class_4, sc.class_5,
                    sc.class_6, sc.class_7, sc.class_8, sc.class_9, sc.class_10
                FROM public.student_counts sc
                WHERE sc.school_udise_code IS NOT NULL 
                    AND sc.school_udise_code > 0
                    ${schoolDataFilterClause}
            )
            ${effectiveCategory === 'subject_breakdown' ? `, subjects_for_school AS (
                SELECT DISTINCT tb.subject_id
                FROM public.tbc_books tb
                WHERE 1=1 ${bookLevelFilters}
            )` : ''}
            , school_distributed_agg AS (
                SELECT
                    tscb.udise_code,
                    ${effectiveCategory === 'subject_breakdown' ? 'tb.subject_id,' : ''}
                    COALESCE(SUM(tscb.received_qty), 0) AS total_received
                FROM public.tbc_school_challan_books tscb
                ${bookTableJoin}
                JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
                WHERE tscb.udise_code IS NOT NULL
                    ${subjectFilterChallan}
                    ${bookLevelFilters}
                GROUP BY tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tb.subject_id' : ''}
            )
            , distributed_agg AS (
                SELECT
                    tscb.udise_code,
                    ${effectiveCategory === 'subject_breakdown' ? 'tb.subject_id,' : ''}
                    COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
                FROM public.tbc_school_challan_books tscb
                ${bookTableJoin}
                JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
                WHERE tscb.udise_code IS NOT NULL
                    ${subjectFilterChallan}
                    ${bookLevelFilters}
                GROUP BY tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tb.subject_id' : ''}
            )
            , scanned_agg AS (
                SELECT
                    tbt.udise_code,
                    ${effectiveCategory === 'subject_breakdown' ? 'tbt.subject_id,' : ''}
                    COALESCE(COUNT(*), 0) AS total_scanned
                FROM public.tbc_book_tracking tbt
                ${bookTableJoin ? bookTableJoin.replace('tscb.book_id', 'tbt.book_id') : ''}
                JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
                WHERE tbt.udise_code IS NOT NULL
                    ${subjectFilterTracking}
                    ${bookLevelFilters}
                GROUP BY tbt.udise_code ${effectiveCategory === 'subject_breakdown' ? ', tbt.subject_id' : ''}
            )
            SELECT
                ${selectGroupByCols ? `${selectGroupByCols},` : ''}
                COALESCE(SUM(sda.total_received), 0) AS school_distributed,
                COALESCE(SUM(da.total_distributed), 0) AS student_distributed,
                COALESCE(SUM(sa.total_scanned), 0) AS total_scanned,
                COALESCE(SUM(sa.total_scanned), 0) - COALESCE(SUM(da.total_distributed), 0) AS scanned_but_not_distributed,
                COALESCE(SUM(sda.total_received), 0) - COALESCE(SUM(sa.total_scanned), 0) AS not_scanned,
                ${finalSelectTotalSchools}
                COALESCE(SUM(fs.total_students), 0) AS total_students
            FROM filtered_schools fs
            ${masterTableJoins.join(' ')}
            ${
                effectiveCategory === 'subject_breakdown' 
                    ? `CROSS JOIN subjects_for_school sfs
                        LEFT JOIN school_distributed_agg sda 
                            ON fs.school_udise_code = sda.udise_code 
                            AND sfs.subject_id = sda.subject_id
                        LEFT JOIN distributed_agg da 
                            ON fs.school_udise_code = da.udise_code 
                            AND sfs.subject_id = da.subject_id
                        LEFT JOIN scanned_agg sa 
                            ON fs.school_udise_code = sa.udise_code 
                            AND sfs.subject_id = sa.subject_id
                        LEFT JOIN public.mst_subjects ms ON sfs.subject_id = ms.id`
                    : `LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
                        LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
                        LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code`
            }
            ${groupByClause}
            ${orderByClause ? `ORDER BY ${orderByClause}` : ''};
        `;

        const result = await pool.query(query, values);
        let responseData = result.rows;
        let finalResponse;

        // Common function to convert numbers to strings for consistency in totalSummary
        const convertNumbersToStrings = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'number' && key !== 'school_udise_code') { 
                    obj[key] = String(obj[key]);
                }
            }
            return obj;
        };

        // Handle different response scenarios
        if (effectiveCategory === 'school_classes_all' && udise_code) {
            finalResponse = { data: [], total: {} };
            if (responseData.length > 0) {
                const schoolInfo = responseData[0];
                const totalSummary = {
                    school_distributed: parseInt(schoolInfo.school_distributed),
                    student_distributed: parseInt(schoolInfo.student_distributed),
                    total_scanned: parseInt(schoolInfo.total_scanned),
                    scanned_but_not_distributed: parseInt(schoolInfo.scanned_but_not_distributed),
                    not_scanned: parseInt(schoolInfo.not_scanned),
                    total_students: parseInt(schoolInfo.total_students),
                    total_schools: parseInt(schoolInfo.total_schools) 
                };
                finalResponse.total = convertNumbersToStrings(totalSummary); 

                for (let i = 1; i <= 10; i++) {
                    const classKey = `class_${i}`;
                    if (schoolInfo[`${classKey}_students`] > 0) {
                        finalResponse.data.push({
                            [`class_${i}`]: {
                                "school_udise_code": String(schoolInfo.school_udise_code), 
                                "school_name": schoolInfo.school_name,
                                "school_distributed": String(parseInt(schoolInfo.school_distributed)),
                                "student_distributed": String(parseInt(schoolInfo.student_distributed)),
                                "total_scanned": String(parseInt(schoolInfo.total_scanned)),
                                "scanned_but_not_distributed": String(parseInt(schoolInfo.scanned_but_not_distributed)),
                                "not_scanned": String(parseInt(schoolInfo.not_scanned)),
                                "total_students": String(parseInt(schoolInfo[`${classKey}_students`]))
                            }
                        });
                    }
                }
            } else {
                finalResponse = {
                    data: [],
                    total: {
                        school_distributed: 0,
                        student_distributed: 0,
                        total_scanned: 0,
                        scanned_but_not_distributed: 0,
                        not_scanned: 0,
                        total_students: 0,
                        total_schools: 0 
                    }
                };
            }
        }
        else if (effectiveCategory === 'class_level_specific' && udise_code && class_level) {
            finalResponse = { data: [], total: {} };
            if (responseData.length > 0) {
                const schoolInfo = responseData[0];
                const totalSummary = {
                    school_distributed: parseInt(schoolInfo.school_distributed),
                    student_distributed: parseInt(schoolInfo.student_distributed),
                    total_scanned: parseInt(schoolInfo.total_scanned),
                    scanned_but_not_distributed: parseInt(schoolInfo.scanned_but_not_distributed),
                    not_scanned: parseInt(schoolInfo.not_scanned),
                    total_students: parseInt(schoolInfo[`class_${class_level}_students`]),
                    total_schools: parseInt(schoolInfo.total_schools) 
                };
                finalResponse.total = convertNumbersToStrings(totalSummary); 

                const classKey = `class_${class_level}`;
                if (schoolInfo[`${classKey}_students`] > 0) {
                    finalResponse.data.push({
                        [`class_${class_level}`]: {
                            "school_udise_code": String(schoolInfo.school_udise_code), 
                            "school_name": schoolInfo.school_name,
                            "school_distributed": String(parseInt(schoolInfo.school_distributed)),
                            "student_distributed": String(parseInt(schoolInfo.student_distributed)),
                            "total_scanned": String(parseInt(schoolInfo.total_scanned)),
                            "scanned_but_not_distributed": String(parseInt(schoolInfo.scanned_but_not_distributed)),
                            "not_scanned": String(parseInt(schoolInfo.not_scanned)),
                            "total_students": String(parseInt(schoolInfo[`${classKey}_students`]))
                        }
                    });
                }
            } else {
                finalResponse = {
                    data: [],
                    total: {
                        school_distributed: 0,
                        student_distributed: 0,
                        total_scanned: 0,
                        scanned_but_not_distributed: 0,
                        not_scanned: 0,
                        total_students: 0,
                        total_schools: 0 
                    }
                };
            }
        }
        else if (effectiveCategory === 'subject_breakdown' && udise_code && class_level) {
            finalResponse = { data: [], total: {
                school_distributed: 0,
                student_distributed: 0,
                total_scanned: 0,
                scanned_but_not_distributed: 0,
                not_scanned: 0,
                total_students: 0,
                total_schools: 0 
            }};

            responseData.forEach(row => {
                finalResponse.total.school_distributed += parseInt(row.school_distributed || 0);
                finalResponse.total.student_distributed += parseInt(row.student_distributed || 0);
                finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
                finalResponse.total.scanned_but_not_distributed += parseInt(row.scanned_but_not_distributed || 0);
                finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);
                finalResponse.total.total_students = parseInt(row.total_students || 0); 
                finalResponse.total.total_schools = 1; 

                finalResponse.data.push({
                    [row.subject_name]: {
                        school_udise_code: String(row.school_udise_code), 
                        school_name: row.school_name,
                        school_distributed: String(parseInt(row.school_distributed || 0)),
                        student_distributed: String(parseInt(row.student_distributed || 0)),
                        total_scanned: String(parseInt(row.total_scanned || 0)),
                        scanned_but_not_distributed: String(parseInt(row.scanned_but_not_distributed || 0)),
                        not_scanned: String(parseInt(row.not_scanned || 0)),
                        total_students: String(parseInt(row.total_students || 0))
                    }
                });
            });
            
            finalResponse.total = convertNumbersToStrings(finalResponse.total);

        }
        else if (responseData.length > 0) { 
            const totalSummary = responseData.reduce((acc, current) => {
                acc.school_distributed = (acc.school_distributed || 0) + parseInt(current.school_distributed || 0);
                acc.student_distributed = (acc.student_distributed || 0) + parseInt(current.student_distributed || 0);
                acc.total_scanned = (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
                acc.scanned_but_not_distributed = (acc.scanned_but_not_distributed || 0) + parseInt(current.scanned_but_not_distributed || 0);
                acc.not_scanned = (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
                acc.total_schools = (acc.total_schools || 0) + parseInt(current.total_schools || 0); 
                acc.total_students = (acc.total_students || 0) + parseInt(current.total_students || 0);
                return acc;
            }, {});
            finalResponse = { total: convertNumbersToStrings(totalSummary), data: responseData }; 
        }
        else { 
            finalResponse = {
                school_distributed: 0,
                student_distributed: 0,
                total_scanned: 0,
                scanned_but_not_distributed: 0,
                not_scanned: 0,
                total_schools: 0, 
                total_students: 0
            };
            if (effectiveCategory !== 'default') { 
                finalResponse = { data: [], total: finalResponse };
            }
        }

        return finalResponse;

    } catch (error) {
        console.error("Error in BookDistributionReportDetails:", error);
        throw error;
    }
};













module.exports = {
  getDepotList,
  getDepotDistrictList,
  fetchStudentBookDistributionReport,
  getCardCounts,
  BookDistributionReportDetails
};
