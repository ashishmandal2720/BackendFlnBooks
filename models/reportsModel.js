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
      whereClauses.push(`mc.district_cd::INTEGER = ANY (
        SELECT unnest(district_cds::int[]) FROM mst_division WHERE division_id = $${
          values.length + 1
        }
      )`);
      values.push(division_id);
    }

    if (depot_id) {
      whereClauses.push(`mc.district_cd::INTEGER = ANY (
        SELECT unnest(district_cds::int[]) FROM mst_depot WHERE depot_cd = $${
          values.length + 1
        }
      )`);
      values.push(depot_id);
    }

    if (district) {
      whereClauses.push(
        `mc.district_cd::INTEGER = $${values.length + 1}::INTEGER`
      );
      values.push(district);
    }

    if (block) {
      whereClauses.push(`mc.block_cd::BIGINT = $${values.length + 1}::BIGINT`);
      values.push(block);
    }

    if (cluster) {
      whereClauses.push(
        `mc.cluster_cd::BIGINT = $${values.length + 1}::BIGINT`
      );
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

// // Main Optimized Function
// const BookDistributionReportDetails = async (filters) => {
//     try {
//         const filterData = processFilters(filters);
//         const { query, values } = buildSqlQuery(filterData);
//         const result = await pool.query(query, values);
//         const responseData = result.rows;

//         return formatResponse(responseData, filterData);
//     } catch (error) {
//         console.error("Error in BookDistributionReportDetails:", error);
//         throw error;
//     }
// };

// const processFilters = (filters) => {
//     const {
//         division_id,
//         depot_id,
//         district,
//         block,
//         cluster,
//         school_type,
//         udise_code,
//         class_level,
//         subject,
//         medium,
//         category = 'depot', // Default category for top-level grouping
//         class_category,
//     } = filters;

//     const schoolTypeMap = {
//         high: 2,
//         private: 3,
//         aatmanand: 1,
//         pm_shree: 4,
//     };

//     let effectiveClassLevels = [];
//     // If a specific class_level is provided, it takes precedence.
//     if (class_level) {
//         effectiveClassLevels.push(class_level);
//     } else if (class_category) {
//         // If class_category is provided, determine the range of class levels.
//         switch (class_category) {
//             case 'primary':
//                 effectiveClassLevels = [1, 2, 3, 4, 5];
//                 break;
//             case 'middle':
//                 effectiveClassLevels = [6, 7, 8];
//                 break;
//             case 'high':
//                 effectiveClassLevels = [9, 10];
//                 break;
//             default:
//                 effectiveClassLevels = []; // No valid class_category
//         }
//     }

//     let determinedEffectiveCategory;

//     // Prioritize specific geographical filters first to determine the main grouping.
//     if (udise_code) {
//         // If UDISE code is present, group by school or subject breakdown.
//         determinedEffectiveCategory = (class_level || subject) ? 'subject_breakdown' : 'school_classes_all';
//     } else if (cluster && cluster !== 'all') {
//         // If cluster is present, group by school within that cluster.
//         determinedEffectiveCategory = 'school';
//     } else if (block && block !== 'all') {
//         // If block is present, group by cluster within that block.
//         determinedEffectiveCategory = 'cluster';
//     } else if (district && district !== 'all') {
//         // If a specific district is chosen, group by blocks within it.
//         determinedEffectiveCategory = 'block';
//     }
//     // MODIFICATION START: If depot_id or division_id is present, group by district within them
//     else if (depot_id || division_id) {
//         determinedEffectiveCategory = 'district';
//     }
//     // MODIFICATION END

//     else if (category === 'district') {
//         // If category is explicitly 'district' and no more granular geo filter, nor specific depot/division ID
//         determinedEffectiveCategory = 'district';
//     } else if (category === 'division') {
//         // If no specific division_id, but 'category' is explicitly 'division', group by division.
//         determinedEffectiveCategory = 'division';
//     } else if (category === 'depot') {
//         // If no specific depot_id, but 'category' is explicitly 'depot', group by depot.
//         determinedEffectiveCategory = 'depot';
//     }
//     else if (class_level || class_category) {
//         determinedEffectiveCategory = 'class_level_summary';
//     } else {
//         // Fallback for an empty filter object or if no other criteria are met.
//         // Ensures 'depot' is the true default grouping.
//         determinedEffectiveCategory = 'depot';
//     }

//     return {
//         division_id,
//         depot_id,
//         district,
//         block,
//         cluster,
//         school_type,
//         udise_code,
//         class_level,
//         subject,
//         medium,
//         category, // Original category parameter is kept for reference
//         schoolTypeMap,
//         effectiveCategory: determinedEffectiveCategory, // The actual category used for grouping
//         class_category, // The category of classes (primary, middle, high)
//         effectiveClassLevels // Array of actual class levels (e.g., [6, 7, 8])
//     };
// };
// // Part 2: SQL Query Construction
// const buildSqlQuery = (filterData) => {
//     const {
//         division_id,
//         depot_id,
//         district,
//         block,
//         cluster,
//         school_type,
//         udise_code,
//         class_level,
//         subject,
//         medium,
//         schoolTypeMap,
//         effectiveCategory,
//         class_category,
//         effectiveClassLevels
//     } = filterData;

//     const whereClauses = [];
//     let values = [];

//     // School-level filters for 'filtered_schools' CTE
//     if (division_id) {
//         whereClauses.push(`mc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_division WHERE division_id = $${values.length + 1})`);
//         values.push(division_id);
//     }
//     if (depot_id) {
//         whereClauses.push(`mc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_depot WHERE depot_cd = $${values.length + 1})`);
//         values.push(depot_id);
//     }
//     if (district && district !== 'all') {
//         whereClauses.push(`mc.district_cd::INTEGER = $${values.length + 1}::INTEGER`);
//         values.push(district);
//     }
//     if (block && block !== 'all') {
//         whereClauses.push(`mc.block_cd::BIGINT = $${values.length + 1}::BIGINT`);
//         values.push(block);
//     }
//     if (cluster && cluster !== 'all') {
//         whereClauses.push(`mc.cluster_cd::BIGINT = $${values.length + 1}::BIGINT`);
//         values.push(cluster);
//     }
//     if (school_type && Number.isInteger(schoolTypeMap[school_type])) {
//         whereClauses.push(`sc.tbc_school_type = $${values.length + 1}`);
//         values.push(schoolTypeMap[school_type]);
//     }
//     if (udise_code) {
//         whereClauses.push(`sc.school_udise_code = $${values.length + 1}`);
//         values.push(udise_code);
//     }

//     if (class_level) {
//         whereClauses.push(`sc.class_${class_level} > 0`);
//     } else if (effectiveClassLevels.length > 0) {
//         const classLevelConditions = effectiveClassLevels.map(cls => `sc.class_${cls} > 0`);
//         whereClauses.push(`(${classLevelConditions.join(' OR ')})`);
//     }

//     const schoolDataFilterClause = whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";

//     // Book-level filters for joins in CTEs
//     const bookCTEJoinFilters = [];
//     if (class_level && class_level >= 1 && class_level <= 10) {
//         bookCTEJoinFilters.push(`tb.class_level = $${values.length + 1}`);
//         values.push(class_level);
//     } else if (effectiveClassLevels.length > 0) {
//         bookCTEJoinFilters.push(`tb.class_level = ANY(ARRAY[${effectiveClassLevels.map((_, i) => `$${values.length + 1 + i}`).join(',')}])`);
//         values.push(...effectiveClassLevels);
//     }

//     if (medium) {
//         bookCTEJoinFilters.push(`ms.medium = $${values.length + 1}`);
//         values.push(medium);
//     }
//     if (subject) {
//         bookCTEJoinFilters.push(`ms.id = $${values.length + 1}`);
//         values.push(subject);
//     }

//     const commonBookJoinAndFilters = `
//         JOIN public.tbc_books tb ON tscb.book_id = tb.id
//         JOIN public.mst_subjects ms ON tb.subject_id = ms.id
//         ${bookCTEJoinFilters.length > 0 ? `AND ${bookCTEJoinFilters.join(' AND ')}` : ''}
//     `;

//     const scannedBookJoinAndFilters = `
//         JOIN public.tbc_books tb ON tbt.book_id = tb.id
//         JOIN public.mst_subjects ms ON tb.subject_id = ms.id
//         ${bookCTEJoinFilters.length > 0 ? `AND ${bookCTEJoinFilters.join(' AND ')}` : ''}
//     `;

//     let selectGroupByCols = '';
//     let groupByClause = '';
//     let masterTableJoins = [];
//     let orderByClause = '';
//     let finalSelectTotalSchools;
//     let finalSelectTotalStudents;
//     let totalScannedSchoolSelect = '0 AS total_scanned_school';
//     let clustersCTE = '';

//     if (effectiveCategory === 'cluster' && block && block !== 'all') {
//         clustersCTE = `
//             , clusters_in_block AS (
//                 SELECT cluster_cd, cluster_name
//                 FROM public.mst_cluster
//                 WHERE block_cd = $${values.length + 1}
//             )
//         `;
//         values.push(block);
//     }

//     switch (effectiveCategory) {
//         case 'depot':
//             selectGroupByCols = 'md.depot_cd, md.depot_name';
//             groupByClause = 'GROUP BY md.depot_cd, md.depot_name';
//             masterTableJoins.push(`LEFT JOIN public.mst_depot md ON fs.district_cd::INTEGER = ANY (md.district_cds::INTEGER[])`);
//             orderByClause = 'md.depot_name';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = (class_level || effectiveClassLevels.length > 0)
//                 ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`
//                 : 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//         case 'division':
//             selectGroupByCols = 'mdiv.division_id, mdiv.division_name';
//             groupByClause = 'GROUP BY mdiv.division_id, mdiv.division_name';
//             masterTableJoins.push(`LEFT JOIN public.mst_division mdiv ON fs.district_cd::INTEGER = ANY (mdiv.district_cds::INTEGER[])`);
//             orderByClause = 'mdiv.division_name';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = (class_level || effectiveClassLevels.length > 0)
//                 ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`
//                 : 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//         case 'district':
//             selectGroupByCols = 'fs.district_cd::INTEGER AS district_cd, mdist.district_name';
//             groupByClause = 'GROUP BY fs.district_cd::INTEGER, mdist.district_name';
//             masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`);
//             orderByClause = 'mdist.district_name';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = (class_level || effectiveClassLevels.length > 0)
//                 ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`
//                 : 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//         case 'block':
//             selectGroupByCols = 'fs.block_cd::BIGINT AS block_cd, mb.block_name';
//             groupByClause = 'GROUP BY fs.block_cd::BIGINT, mb.block_name';
//             masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`);
//             masterTableJoins.push(`LEFT JOIN public.mst_block mb ON fs.block_cd::BIGINT = mb.block_cd::BIGINT`);
//             orderByClause = 'mb.block_name';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = (class_level || effectiveClassLevels.length > 0)
//                 ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`
//                 : 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//         case 'cluster':
//             selectGroupByCols = 'mcl.cluster_cd, mcl.cluster_name';
//             groupByClause = 'GROUP BY mcl.cluster_cd, mcl.cluster_name';
//             masterTableJoins.push(`LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`);
//             masterTableJoins.push(`LEFT JOIN public.mst_block mb ON fs.block_cd::BIGINT = mb.block_cd::BIGINT`);
//             orderByClause = 'mcl.cluster_name';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = (class_level || effectiveClassLevels.length > 0)
//                 ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`
//                 : 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//         case 'school':
//             selectGroupByCols = 'fs.school_udise_code, fs.school_name';
//             groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
//             orderByClause = 'fs.school_udise_code';
//             finalSelectTotalSchools = '1 AS total_schools,';
//             finalSelectTotalStudents = (class_level || effectiveClassLevels.length > 0)
//                 ? `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`
//                 : 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = 'CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school';
//             break;
//         case 'school_classes_all':
//             selectGroupByCols = `fs.school_udise_code, fs.school_name,
//                                  ${[...Array(10).keys()].map(i => `SUM(fs.class_${i + 1}) AS class_${i + 1}_students`).join(', ')}`;
//             groupByClause = 'GROUP BY fs.school_udise_code, fs.school_name';
//             orderByClause = 'fs.school_udise_code';
//             finalSelectTotalSchools = '1 AS total_schools,';
//             finalSelectTotalStudents = 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = 'CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school';
//             break;
//         case 'subject_breakdown':
//             selectGroupByCols = `sfs.subject_name,
//                                  fs.school_udise_code,
//                                  fs.school_name`;
//             groupByClause = `GROUP BY sfs.subject_name, fs.school_udise_code, fs.school_name`;
//             orderByClause = `sfs.subject_name`;
//             finalSelectTotalSchools = `CASE WHEN COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) > 0 THEN 1 ELSE 0 END AS total_schools,`;
//             finalSelectTotalStudents = `COALESCE(SUM(${effectiveClassLevels.map(cls => `fs.class_${cls}`).join(' + ')}), 0) AS total_students`;
//             totalScannedSchoolSelect = 'CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school';
//             break;
//         case 'class_level_summary':
//             selectGroupByCols = '';
//             groupByClause = '';
//             masterTableJoins = [];
//             orderByClause = '';
//             if (class_level) {
//                 finalSelectTotalSchools = 'COUNT(DISTINCT CASE WHEN fs.class_' + class_level + ' > 0 THEN fs.school_udise_code END) AS total_schools,';
//                 finalSelectTotalStudents = 'COALESCE(SUM(fs.class_' + class_level + '), 0) AS total_students';
//                 totalScannedSchoolSelect = 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND fs.class_' + class_level + ' > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             } else if (effectiveClassLevels.length > 0) {
//                 const totalStudentsSum = effectiveClassLevels.map(cls => `COALESCE(fs.class_${cls}, 0)`).join(' + ');
//                 finalSelectTotalSchools = `COUNT(DISTINCT CASE WHEN (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_schools,`;
//                 finalSelectTotalStudents = `COALESCE(SUM(${totalStudentsSum}), 0) AS total_students`;
//                 totalScannedSchoolSelect = `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels.map(cls => `fs.class_${cls} > 0`).join(' OR ')}) THEN fs.school_udise_code END) AS total_scanned_school`;
//             } else {
//                 finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//                 finalSelectTotalStudents = 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//                 totalScannedSchoolSelect = 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             }
//             break;
//         default:
//             selectGroupByCols = '';
//             groupByClause = '';
//             masterTableJoins = [];
//             orderByClause = '';
//             finalSelectTotalSchools = 'COUNT(DISTINCT fs.school_udise_code) AS total_schools,';
//             finalSelectTotalStudents = 'COALESCE(SUM(fs.total_students), 0) AS total_students';
//             totalScannedSchoolSelect = 'COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school';
//             break;
//     }

//     let subjectsForSchoolCTE = '';
//     if (effectiveCategory === 'subject_breakdown') {
//         const subjectFilterValues = [];
//         let subjectMstWhere = [];
//         if (class_level) {
//             subjectMstWhere.push(`ms.class_level = $${values.length + subjectFilterValues.length + 1}`);
//             subjectFilterValues.push(String(class_level));
//         } else if (effectiveClassLevels.length > 0) {
//             subjectMstWhere.push(`ms.class_level = ANY(ARRAY[${effectiveClassLevels.map((_, i) => `$${values.length + subjectFilterValues.length + 1 + i}`).join(',')}])`);
//             subjectFilterValues.push(...effectiveClassLevels.map(String));
//         }
//         if (medium) {
//             subjectMstWhere.push(`ms.medium = $${values.length + subjectFilterValues.length + 1}`);
//             subjectFilterValues.push(medium);
//         }
//         if (subject) {
//             subjectMstWhere.push(`ms.id = $${values.length + subjectFilterValues.length + 1}`);
//             subjectFilterValues.push(subject);
//         }

//         subjectsForSchoolCTE = `
//             , subjects_for_school AS (
//                 SELECT DISTINCT ms.id AS subject_id, ms.name AS subject_name
//                 FROM public.mst_subjects ms
//                 WHERE 1=1 ${subjectMstWhere.length > 0 ? `AND ${subjectMstWhere.join(' AND ')}` : ''}
//             )
//         `;
//         values.push(...subjectFilterValues);
//     }

//     const query = `
//         WITH filtered_schools AS (
//             SELECT DISTINCT ON (sc.school_udise_code)
//                 sc.school_udise_code,
//                 mc.district_cd,
//                 mc.block_cd,
//                 mc.cluster_cd,
//                 sc.tbc_school_type,
//                 sc.total_students,
//                 sc.school_name,
//                 sc.class_1, sc.class_2, sc.class_3, sc.class_4, sc.class_5,
//                 sc.class_6, sc.class_7, sc.class_8, sc.class_9, sc.class_10
//             FROM public.student_counts sc
//             LEFT JOIN mst_schools as mc ON mc.udise_sch_code = sc.school_udise_code::bigint
//             WHERE sc.school_udise_code IS NOT NULL
//                 AND sc.school_udise_code > 0
//                 ${schoolDataFilterClause}
//         )
//         ${clustersCTE}
//         ${subjectsForSchoolCTE}
//         , school_distributed_agg AS (
//             SELECT
//                 fs.cluster_cd,
//                 tscb.udise_code,
//                 ${effectiveCategory === 'subject_breakdown' ? 'ms.id AS subject_id,' : ''}
//                 COALESCE(SUM(tscb.quantity), 0) AS total_quantity
//             FROM public.tbc_school_challan_books tscb
//             ${commonBookJoinAndFilters}
//             JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//             GROUP BY fs.cluster_cd, tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', ms.id' : ''}
//         )
//         , distributed_agg AS (
//             SELECT
//                 fs.cluster_cd,
//                 tscb.udise_code,
//                 ${effectiveCategory === 'subject_breakdown' ? 'ms.id AS subject_id,' : ''}
//                 COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
//             FROM public.tbc_school_challan_books tscb
//             ${commonBookJoinAndFilters}
//             JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
//             GROUP BY fs.cluster_cd, tscb.udise_code ${effectiveCategory === 'subject_breakdown' ? ', ms.id' : ''}
//         )
//         , scanned_agg AS (
//             SELECT
//                 fs.cluster_cd,
//                 tbt.udise_code,
//                 ${effectiveCategory === 'subject_breakdown' ? 'ms.id AS subject_id,' : ''}
//                 COALESCE(COUNT(*), 0) AS total_scanned
//             FROM public.tbc_book_tracking tbt
//             ${scannedBookJoinAndFilters}
//             JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
//             GROUP BY fs.cluster_cd, tbt.udise_code ${effectiveCategory === 'subject_breakdown' ? ', ms.id' : ''}
//         )
//         SELECT
//             ${selectGroupByCols ? `${selectGroupByCols},` : ''}
//             COALESCE(SUM(sda.total_quantity), 0) AS school_distributed,
//             COALESCE(SUM(da.total_distributed), 0) AS student_distributed,
//             COALESCE(SUM(sa.total_scanned), 0) AS total_scanned,
//             COALESCE(SUM(sa.total_scanned), 0) - COALESCE(SUM(da.total_distributed), 0) AS scanned_but_not_distributed,
//             COALESCE(SUM(sda.total_quantity), 0) - COALESCE(SUM(sa.total_scanned), 0) AS not_scanned,
//             ${finalSelectTotalSchools}
//             ${totalScannedSchoolSelect},
//             ${finalSelectTotalStudents}
//         FROM ${effectiveCategory === 'cluster' ? 'clusters_in_block mcl LEFT JOIN filtered_schools fs ON fs.cluster_cd::BIGINT = mcl.cluster_cd' : 'filtered_schools fs'}
//         ${masterTableJoins.join(' ')}
//         ${
//             effectiveCategory === 'subject_breakdown'
//                 ? `CROSS JOIN subjects_for_school sfs
//                     LEFT JOIN school_distributed_agg sda
//                         ON fs.school_udise_code = sda.udise_code
//                         AND sfs.subject_id = sda.subject_id
//                     LEFT JOIN distributed_agg da
//                         ON fs.school_udise_code = da.udise_code
//                         AND sfs.subject_id = da.subject_id
//                     LEFT JOIN scanned_agg sa
//                         ON fs.school_udise_code = sa.udise_code
//                         AND sfs.subject_id = sa.subject_id`
//                 : `LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
//                     LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
//                     LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code`
//         }
//         ${groupByClause}
//         ${orderByClause ? `ORDER BY ${orderByClause}` : ''};
//     `;
//     return { query, values };
// };

// // Part 3: Response Formatting
// const formatResponse = (responseData, filterData) => {
//     const { effectiveCategory, udise_code, class_level, class_category, effectiveClassLevels } = filterData;

//     const convertNumbersToStrings = (obj) => {
//         for (const key in obj) {
//             if (typeof obj[key] === 'number' && key !== 'school_udise_code' && key !== 'cluster_cd') {
//                 obj[key] = String(obj[key]);
//             }
//         }
//         return obj;
//     };

//     let finalResponse;

//     if (effectiveCategory === 'school_classes_all' && udise_code) {
//         finalResponse = { data: [], total: {} };
//         if (responseData.length > 0) {
//             const schoolInfo = responseData[0];
//             const totalSummary = {
//                 school_distributed: parseInt(schoolInfo.school_distributed),
//                 student_distributed: parseInt(schoolInfo.student_distributed),
//                 total_scanned: parseInt(schoolInfo.total_scanned),
//                 scanned_but_not_distributed: parseInt(schoolInfo.scanned_but_not_distributed),
//                 not_scanned: parseInt(schoolInfo.not_scanned),
//                 total_students: parseInt(schoolInfo.total_students),
//                 total_schools: parseInt(schoolInfo.total_schools),
//                 total_scanned_school: parseInt(schoolInfo.total_scanned_school)
//             };
//             finalResponse.total = convertNumbersToStrings(totalSummary);

//             let classesToIterate = [];
//             // Determine which classes to display for school_classes_all view
//             if (class_level) {
//                 classesToIterate.push(class_level);
//             } else if (class_category) {
//                 classesToIterate = effectiveClassLevels; // Use effectiveClassLevels directly
//             } else {
//                 classesToIterate = Array.from({ length: 10 }, (_, i) => i + 1); // All classes 1-10
//             }

//             for (const cls of classesToIterate) {
//                 const classKey = `class_${cls}`;
//                 if (schoolInfo[`${classKey}_students`] !== undefined) { // Check if the class data exists
//                     finalResponse.data.push({
//                         [`class_${cls}`]: {
//                             school_udise_code: String(schoolInfo.school_udise_code),
//                             school_name: schoolInfo.school_name,
//                             school_distributed: String(parseInt(schoolInfo.school_distributed)),
//                             student_distributed: String(parseInt(schoolInfo.student_distributed)),
//                             total_scanned: String(parseInt(schoolInfo.total_scanned)),
//                             scanned_but_not_distributed: String(parseInt(schoolInfo.scanned_but_not_distributed)),
//                             not_scanned: String(parseInt(schoolInfo.not_scanned)),
//                             total_students: String(parseInt(schoolInfo[`${classKey}_students`] || 0)), // Ensure default to 0 if null/undefined
//                             total_scanned_school: String(parseInt(schoolInfo.total_scanned_school))
//                         }
//                     });
//                 }
//             }
//         } else {
//             finalResponse = {
//                 data: [],
//                 total: {
//                     school_distributed: "0",
//                     student_distributed: "0",
//                     total_scanned: "0",
//                     scanned_but_not_distributed: "0",
//                     not_scanned: "0",
//                     total_students: "0",
//                     total_schools: "0",
//                     total_scanned_school: "0"
//                 }
//             };
//         }
//     } else if (effectiveCategory === 'subject_breakdown' && udise_code && (class_level || class_category)) {
//         finalResponse = {
//             data: [],
//             total: {
//                 school_distributed: 0,
//                 student_distributed: 0,
//                 total_scanned: 0,
//                 scanned_but_not_distributed: 0,
//                 not_scanned: 0,
//                 total_students: 0,
//                 total_schools: 0,
//                 total_scanned_school: 0
//             }
//         };
//         if (responseData.length > 0) {
//             // Calculate total_students and total_schools from raw response, as they are not summed per subject
//             const schoolInfoForTotals = responseData[0]; // Assuming totals are consistent across rows for the same school/class
//             finalResponse.total.total_students = parseInt(schoolInfoForTotals.total_students || 0);
//             finalResponse.total.total_schools = parseInt(schoolInfoForTotals.total_schools || 0);
//             finalResponse.total.total_scanned_school = parseInt(schoolInfoForTotals.total_scanned_school || 0);
//         }

//         responseData.forEach(row => {
//             finalResponse.total.school_distributed += parseInt(row.school_distributed || 0);
//             finalResponse.total.student_distributed += parseInt(row.student_distributed || 0);
//             finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
//             finalResponse.total.scanned_but_not_distributed += parseInt(row.scanned_but_not_distributed || 0);
//             finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);

//             finalResponse.data.push({
//                 [row.subject_name]: {
//                     school_udise_code: String(row.school_udise_code),
//                     school_name: row.school_name,
//                     school_distributed: String(parseInt(row.school_distributed || 0)),
//                     student_distributed: String(parseInt(row.student_distributed || 0)),
//                     total_scanned: String(parseInt(row.total_scanned || 0)),
//                     scanned_but_not_distributed: String(parseInt(row.scanned_but_not_distributed || 0)),
//                     not_scanned: String(parseInt(row.not_scanned || 0)),
//                     total_students: String(parseInt(row.total_students || 0)),
//                     total_scanned_school: String(parseInt(row.total_scanned_school || 0))
//                 }
//             });
//         });

//         finalResponse.total = convertNumbersToStrings(finalResponse.total);
//     } else if (effectiveCategory === 'class_level_summary' && (class_level || class_category)) {
//         finalResponse = { data: [], total: {} };
//         if (responseData.length > 0) {
//             const totalSummary = responseData.reduce((acc, current) => {
//                 acc.school_distributed = (acc.school_distributed || 0) + parseInt(current.school_distributed || 0);
//                 acc.student_distributed = (acc.student_distributed || 0) + parseInt(current.student_distributed || 0);
//                 acc.total_scanned = (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
//                 acc.scanned_but_not_distributed = (acc.scanned_but_not_distributed || 0) + parseInt(current.scanned_but_not_distributed || 0);
//                 acc.not_scanned = (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
//                 acc.total_students = (acc.total_students || 0) + parseInt(current.total_students || 0);
//                 acc.total_schools = (acc.total_schools || 0) + parseInt(current.total_schools || 0);
//                 acc.total_scanned_school = (acc.total_scanned_school || 0) + parseInt(current.total_scanned_school || 0);
//                 return acc;
//             }, {});
//             finalResponse.total = convertNumbersToStrings(totalSummary);

//             if (class_level) {
//                 finalResponse.data = responseData.map(row => ({
//                     level: `Class ${class_level}`,
//                     total_students: String(row.total_students),
//                     total_schools: String(row.total_schools),
//                     total_scanned_school: String(row.total_scanned_school),
//                     school_distributed: String(row.school_distributed),
//                     student_distributed: String(row.student_distributed),
//                     total_scanned: String(row.total_scanned),
//                     scanned_but_not_distributed: String(row.scanned_but_not_distributed),
//                     not_scanned: String(row.not_scanned),
//                 }));
//             } else if (class_category) {
//                 finalResponse.data = [{
//                     level: class_category.charAt(0).toUpperCase() + class_category.slice(1), // Capitalize first letter
//                     total_students: String(finalResponse.total.total_students),
//                     total_schools: String(finalResponse.total.total_schools),
//                     total_scanned_school: String(finalResponse.total.total_scanned_school),
//                     school_distributed: String(finalResponse.total.school_distributed),
//                     student_distributed: String(finalResponse.total.student_distributed),
//                     total_scanned: String(finalResponse.total.total_scanned),
//                     scanned_but_not_distributed: String(finalResponse.total.scanned_but_not_distributed),
//                     not_scanned: String(finalResponse.total.not_scanned),
//                 }];
//             }

//         } else {
//             finalResponse = {
//                 data: [],
//                 total: {
//                     school_distributed: "0",
//                     student_distributed: "0",
//                     total_scanned: "0",
//                     scanned_but_not_distributed: "0",
//                     not_scanned: "0",
//                     total_students: "0",
//                     total_schools: "0",
//                     total_scanned_school: "0"
//                 }
//             };
//         }
//     } else if (effectiveCategory === 'cluster') {
//         finalResponse = {
//             data: [],
//             total: {
//                 school_distributed: 0,
//                 student_distributed: 0,
//                 total_scanned: 0,
//                 scanned_but_not_distributed: 0,
//                 not_scanned: 0,
//                 total_students: 0,
//                 total_schools: 0,
//                 total_scanned_school: 0
//             }
//         };
//         responseData.forEach(row => {
//             finalResponse.total.school_distributed += parseInt(row.school_distributed || 0);
//             finalResponse.total.student_distributed += parseInt(row.student_distributed || 0);
//             finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
//             finalResponse.total.scanned_but_not_distributed += parseInt(row.scanned_but_not_distributed || 0);
//             finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);
//             finalResponse.total.total_students += parseInt(row.total_students || 0);
//             finalResponse.total.total_schools += parseInt(row.total_schools || 0);
//             finalResponse.total.total_scanned_school += parseInt(row.total_scanned_school || 0);

//             finalResponse.data.push({
//                 cluster_cd: String(row.cluster_cd),
//                 cluster_name: row.cluster_name,
//                 school_distributed: String(parseInt(row.school_distributed || 0)),
//                 student_distributed: String(parseInt(row.student_distributed || 0)),
//                 total_scanned: String(parseInt(row.total_scanned || 0)),
//                 scanned_but_not_distributed: String(parseInt(row.scanned_but_not_distributed || 0)),
//                 not_scanned: String(parseInt(row.not_scanned || 0)),
//                 total_students: String(parseInt(row.total_students || 0)),
//                 total_schools: String(parseInt(row.total_schools || 0)),
//                 total_scanned_school: String(parseInt(row.total_scanned_school || 0))
//             });
//         });

//         finalResponse.total = convertNumbersToStrings(finalResponse.total);
//     } else if (responseData.length > 0) {
//         const totalSummary = responseData.reduce((acc, current) => {
//             acc.school_distributed = (acc.school_distributed || 0) + parseInt(current.school_distributed || 0);
//             acc.student_distributed = (acc.student_distributed || 0) + parseInt(current.student_distributed || 0);
//             acc.total_scanned = (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
//             acc.scanned_but_not_distributed = (acc.scanned_but_not_distributed || 0) + parseInt(current.scanned_but_not_distributed || 0);
//             acc.not_scanned = (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
//             acc.total_schools = (acc.total_schools || 0) + parseInt(current.total_schools || 0);
//             acc.total_students = (acc.total_students || 0) + parseInt(current.total_students || 0);
//             acc.total_scanned_school = (acc.total_scanned_school || 0) + parseInt(current.total_scanned_school || 0);
//             return acc;
//         }, {});
//         finalResponse = { total: convertNumbersToStrings(totalSummary), data: responseData.map(row => convertNumbersToStrings({ ...row })) };
//     } else {
//         finalResponse = {
//             data: [],
//             total: {
//                 school_distributed: "0",
//                 student_distributed: "0",
//                 total_scanned: "0",
//                 scanned_but_not_distributed: "0",
//                 not_scanned: "0",
//                 total_students: "0",
//                 total_schools: "0",
//                 total_scanned_school: "0"
//             }
//         };
//     }

//     return finalResponse;
// };

const BookDistributionReportDetails = async (filters) => {
  try {
    const filterData = processFilters(filters);
    const { query, values } = buildSqlQuery(filterData);
    const result = await pool.query(query, values);
    const responseData = result.rows;

    return formatResponse(responseData, filterData);
  } catch (error) {
    console.error("Error in BookDistributionReportDetails:", error);
    throw error;
  }
};

const processFilters = (filters) => {
 let {
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
    category = "depot", // Default category for top-level grouping
    class_category
  } = filters;

 if(school_type ==='government' && !class_category) {  
        class_category = 'combined';
     }

  const schoolTypeMap = {
    high: 2,
    private: 3,
    aatmanand: 1,
    pm_shree: 4,
    government: 5, // Government school type
  };

  let effectiveClassLevels = [];
  if (class_level) {
    effectiveClassLevels.push(class_level);
  } else if (class_category) {
    switch (class_category) {
      case "primary":
        effectiveClassLevels = [1, 2, 3, 4, 5];
        break;
      case "middle":
        effectiveClassLevels = [6, 7, 8];
        break;
          case "combined":
        effectiveClassLevels = [1, 2, 3, 4, 5,6, 7, 8];
        break;
      case "high":
        effectiveClassLevels = [9, 10];
        break;
      default:
        effectiveClassLevels = [];
    }
  }

  let determinedEffectiveCategory;

  if (udise_code) {
    determinedEffectiveCategory =
      class_level || subject ? "subject_breakdown" : "school_classes_all";
  } else if (cluster && cluster !== "all") {
    determinedEffectiveCategory = "school";
  } else if (block && block !== "all") {
    determinedEffectiveCategory = "cluster";
  } else if (district && district !== "all") {
    determinedEffectiveCategory = "block";
  } else if (depot_id || division_id) {
    determinedEffectiveCategory = "district";
  } else if (category === "district") {
    determinedEffectiveCategory = "district";
  } else if (category === "division") {
    determinedEffectiveCategory = "division";
  } else if (category === "depot") {
    determinedEffectiveCategory = "depot";
  } else if (class_level || class_category) {
    determinedEffectiveCategory = "class_level_summary";
  } else {
    determinedEffectiveCategory = "depot";
  }

  return {
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
    category,
    schoolTypeMap,
    effectiveCategory: determinedEffectiveCategory,
    class_category,
    effectiveClassLevels,
  };
};

const buildSqlQuery = (filterData) => {
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
    schoolTypeMap,
    effectiveCategory,
    class_category,
    effectiveClassLevels,
  } = filterData;

  const whereClausesStudentCounts = [];
  const whereClausesClusterStudentCount = [];
  let values = [];

  // School-level filters for both tables
  if (division_id) {
    whereClausesStudentCounts.push(
      `mc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_division WHERE division_id = $${
        values.length + 1
      })`
    );
    whereClausesClusterStudentCount.push(
      `csc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_division WHERE division_id = $${
        values.length + 1
      })`
    );
    values.push(division_id);
  }
  if (depot_id) {
    whereClausesStudentCounts.push(
      `mc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_depot WHERE depot_cd = $${
        values.length + 1
      })`
    );
    whereClausesClusterStudentCount.push(
      `csc.district_cd::INTEGER = ANY (SELECT unnest(district_cds::INTEGER[]) FROM public.mst_depot WHERE depot_cd = $${
        values.length + 1
      })`
    );
    values.push(depot_id);
  }
  if (district && district !== "all") {
    whereClausesStudentCounts.push(
      `mc.district_cd::INTEGER = $${values.length + 1}::INTEGER`
    );
    whereClausesClusterStudentCount.push(
      `csc.district_cd::INTEGER = $${values.length + 1}::INTEGER`
    );
    values.push(district);
  }
  if (block && block !== "all") {
    whereClausesStudentCounts.push(
      `mc.block_cd::BIGINT = $${values.length + 1}::BIGINT`
    );
    whereClausesClusterStudentCount.push(
      `csc.block_cd::BIGINT = $${values.length + 1}::BIGINT`
    );
    values.push(block);
  }
  if (cluster && cluster !== "all") {
    whereClausesStudentCounts.push(
      `mc.cluster_cd::BIGINT = $${values.length + 1}::BIGINT`
    );
    whereClausesClusterStudentCount.push(
      `csc.cluster_cd::BIGINT = $${values.length + 1}::BIGINT`
    );
    values.push(cluster);
  }
  if (udise_code) {
    whereClausesStudentCounts.push(
      `sc.school_udise_code = $${values.length + 1}`
    );
    whereClausesClusterStudentCount.push(
      `csc.udise_sch_code = $${values.length + 1}`
    );
    values.push(udise_code);
  }
  if (class_level) {
    whereClausesStudentCounts.push(`sc.class_${class_level} > 0`);
    if (class_level <= 8) {
      // cluster_student_count only has classes 1-8
      whereClausesClusterStudentCount.push(`csc.class_${class_level} > 0`);
    }
  } else if (effectiveClassLevels.length > 0) {
    const classLevelConditionsStudentCounts = effectiveClassLevels.map(
      (cls) => `sc.class_${cls} > 0`
    );
    const classLevelConditionsClusterStudentCount = effectiveClassLevels
      .filter((cls) => cls <= 8) // Only include classes 1-8 for cluster_student_count
      .map((cls) => `csc.class_${cls} > 0`);
    whereClausesStudentCounts.push(
      `(${classLevelConditionsStudentCounts.join(" OR ")})`
    );
    if (classLevelConditionsClusterStudentCount.length > 0) {
      whereClausesClusterStudentCount.push(
        `(${classLevelConditionsClusterStudentCount.join(" OR ")})`
      );
    }
  }
  if (
    school_type &&
    Number.isInteger(schoolTypeMap[school_type]) &&
    school_type !== "government"
  ) {
    whereClausesStudentCounts.push(
      `sc.tbc_school_type = $${values.length + 1}`
    );
    values.push(schoolTypeMap[school_type]);
  }

 
  const schoolDataFilterClauseStudentCounts =
    whereClausesStudentCounts.length > 0
      ? `AND ${whereClausesStudentCounts.join(" AND ")}`
      : "";
  const schoolDataFilterClauseClusterStudentCount =
    whereClausesClusterStudentCount.length > 0
      ? `AND ${whereClausesClusterStudentCount.join(" AND ")}`
      : "";

  // Book-level filters for joins in CTEs
  const bookCTEJoinFilters = [];
  if (class_level && class_level >= 1 && class_level <= 10) {
    bookCTEJoinFilters.push(`tb.class_level = $${values.length + 1}`);
    values.push(class_level);
  } else if (effectiveClassLevels.length > 0) {
    bookCTEJoinFilters.push(
      `tb.class_level = ANY(ARRAY[${effectiveClassLevels
        .map((_, i) => `$${values.length + 1 + i}`)
        .join(",")}])`
    );
    values.push(...effectiveClassLevels);
  }

  if (medium) {
    bookCTEJoinFilters.push(`ms.medium = $${values.length + 1}`);
    values.push(medium);
  }
  if (subject) {
    bookCTEJoinFilters.push(`ms.id = $${values.length + 1}`);
    values.push(subject);
  }

  const commonBookJoinAndFilters = `
        JOIN public.tbc_books tb ON tscb.book_id = tb.id
        JOIN public.mst_subjects ms ON tb.subject_id = ms.id
        ${
          bookCTEJoinFilters.length > 0
            ? `AND ${bookCTEJoinFilters.join(" AND ")}`
            : ""
        }
    `;

  const scannedBookJoinAndFilters = `
        JOIN public.tbc_books tb ON tbt.book_id = tb.id
        JOIN public.mst_subjects ms ON tb.subject_id = ms.id
        ${
          bookCTEJoinFilters.length > 0
            ? `AND ${bookCTEJoinFilters.join(" AND ")}`
            : ""
        }
    `;

  let selectGroupByCols = "";
  let groupByClause = "";
  let masterTableJoins = [];
  let orderByClause = "";
  let finalSelectTotalSchools;
  let finalSelectTotalStudents;
  let totalScannedSchoolSelect = "0 AS total_scanned_school";
  let clustersCTE = "";

  if (effectiveCategory === "cluster" && block && block !== "all") {
    clustersCTE = `
            , clusters_in_block AS (
                SELECT cluster_cd, cluster_name
                FROM public.mst_cluster
                WHERE block_cd = $${values.length + 1}
            )
        `;
    values.push(block);
  }

  switch (effectiveCategory) {
    case "depot":
      selectGroupByCols = "md.depot_cd, md.depot_name";
      groupByClause = "GROUP BY md.depot_cd, md.depot_name";
      masterTableJoins.push(
        `INNER JOIN public.mst_depot md ON fs.district_cd::INTEGER = ANY (md.district_cds::INTEGER[])`
      );
      orderByClause = "md.depot_name";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        class_level || effectiveClassLevels.length > 0
          ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
              .map((cls) => `fs.class_${cls} > 0`)
              .join(
                " OR "
              )}) THEN fs.school_udise_code END) AS total_scanned_school`
          : "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
    case "division":
      selectGroupByCols = "mdiv.division_id, mdiv.division_name";
      groupByClause = "GROUP BY mdiv.division_id, mdiv.division_name";
      masterTableJoins.push(
        `INNER JOIN public.mst_division mdiv ON fs.district_cd::INTEGER = ANY (mdiv.district_cds::INTEGER[])`
      );
      orderByClause = "mdiv.division_name";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        class_level || effectiveClassLevels.length > 0
          ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
              .map((cls) => `fs.class_${cls} > 0`)
              .join(
                " OR "
              )}) THEN fs.school_udise_code END) AS total_scanned_school`
          : "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
    case "district":
      selectGroupByCols =
        "fs.district_cd::INTEGER AS district_cd, mdist.district_name";
      groupByClause = "GROUP BY fs.district_cd::INTEGER, mdist.district_name";
      masterTableJoins.push(
        `LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`
      );
      orderByClause = "mdist.district_name";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        class_level || effectiveClassLevels.length > 0
          ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
              .map((cls) => `fs.class_${cls} > 0`)
              .join(
                " OR "
              )}) THEN fs.school_udise_code END) AS total_scanned_school`
          : "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
    case "block":
      selectGroupByCols = "fs.block_cd::BIGINT AS block_cd, mb.block_name";
      groupByClause = "GROUP BY fs.block_cd::BIGINT, mb.block_name";
      masterTableJoins.push(
        `LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`
      );
      masterTableJoins.push(
        `LEFT JOIN public.mst_block mb ON fs.block_cd::BIGINT = mb.block_cd::BIGINT`
      );
      orderByClause = "mb.block_name";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        class_level || effectiveClassLevels.length > 0
          ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
              .map((cls) => `fs.class_${cls} > 0`)
              .join(
                " OR "
              )}) THEN fs.school_udise_code END) AS total_scanned_school`
          : "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
    case "cluster":
      selectGroupByCols = "mcl.cluster_cd, mcl.cluster_name";
      groupByClause = "GROUP BY mcl.cluster_cd, mcl.cluster_name";
      masterTableJoins.push(
        `LEFT JOIN public.mst_district mdist ON fs.district_cd::INTEGER = mdist.district_cd::INTEGER`
      );
      masterTableJoins.push(
        `LEFT JOIN public.mst_block mb ON fs.block_cd::BIGINT = mb.block_cd::BIGINT`
      );
      orderByClause = "mcl.cluster_name";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        class_level || effectiveClassLevels.length > 0
          ? `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
              .map((cls) => `fs.class_${cls} > 0`)
              .join(
                " OR "
              )}) THEN fs.school_udise_code END) AS total_scanned_school`
          : "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
    case "school":
      selectGroupByCols = "fs.school_udise_code, fs.school_name";
      groupByClause = "GROUP BY fs.school_udise_code, fs.school_name";
      orderByClause = "fs.school_udise_code";
      finalSelectTotalSchools = "1 AS total_schools,";
      finalSelectTotalStudents =
        class_level || effectiveClassLevels.length > 0
          ? `COALESCE(SUM(${effectiveClassLevels
              .map((cls) => `fs.class_${cls}`)
              .join(" + ")}), 0) AS total_students`
          : "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        "CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school";
      break;
    case "school_classes_all":
      selectGroupByCols = `fs.school_udise_code, fs.school_name,
                                 ${[...Array(10).keys()]
                                   .map(
                                     (i) =>
                                       `SUM(fs.class_${i + 1}) AS class_${
                                         i + 1
                                       }_students`
                                   )
                                   .join(", ")}`;
      groupByClause = "GROUP BY fs.school_udise_code, fs.school_name";
      orderByClause = "fs.school_udise_code";
      finalSelectTotalSchools = "1 AS total_schools,";
      finalSelectTotalStudents =
        "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        "CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school";
      break;
    case "subject_breakdown":
      selectGroupByCols = `sfs.subject_name,
                                 fs.school_udise_code,
                                 fs.school_name`;
      groupByClause = `GROUP BY sfs.subject_name, fs.school_udise_code, fs.school_name`;
      orderByClause = `sfs.subject_name`;
      finalSelectTotalSchools = `CASE WHEN COALESCE(SUM(${effectiveClassLevels
        .map((cls) => `fs.class_${cls}`)
        .join(" + ")}), 0) > 0 THEN 1 ELSE 0 END AS total_schools,`;
      finalSelectTotalStudents = `COALESCE(SUM(${effectiveClassLevels
        .map((cls) => `fs.class_${cls}`)
        .join(" + ")}), 0) AS total_students`;
      totalScannedSchoolSelect =
        "CASE WHEN COALESCE(SUM(sa.total_scanned), 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school";
      break;
    case "class_level_summary":
      selectGroupByCols = "";
      groupByClause = "";
      masterTableJoins = [];
      orderByClause = "";
      if (class_level) {
        finalSelectTotalSchools =
          "COUNT(DISTINCT CASE WHEN fs.class_" +
          class_level +
          " > 0 THEN fs.school_udise_code END) AS total_schools,";
        finalSelectTotalStudents =
          "COALESCE(SUM(fs.class_" + class_level + "), 0) AS total_students";
        totalScannedSchoolSelect =
          "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND fs.class_" +
          class_level +
          " > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      } else if (effectiveClassLevels.length > 0) {
        const totalStudentsSum = effectiveClassLevels
          .map((cls) => `COALESCE(fs.class_${cls}, 0)`)
          .join(" + ");
        finalSelectTotalSchools = `COUNT(DISTINCT CASE WHEN (${effectiveClassLevels
          .map((cls) => `fs.class_${cls} > 0`)
          .join(" OR ")}) THEN fs.school_udise_code END) AS total_schools,`;
        finalSelectTotalStudents = `COALESCE(SUM(${totalStudentsSum}), 0) AS total_students`;
        totalScannedSchoolSelect = `COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 AND (${effectiveClassLevels
          .map((cls) => `fs.class_${cls} > 0`)
          .join(
            " OR "
          )}) THEN fs.school_udise_code END) AS total_scanned_school`;
      } else {
        finalSelectTotalSchools =
          "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
        finalSelectTotalStudents =
          "COALESCE(SUM(fs.total_students), 0) AS total_students";
        totalScannedSchoolSelect =
          "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      }
      break;
    default:
      selectGroupByCols = "";
      groupByClause = "";
      masterTableJoins = [];
      orderByClause = "";
      finalSelectTotalSchools =
        "COUNT(DISTINCT fs.school_udise_code) AS total_schools,";
      finalSelectTotalStudents =
        "COALESCE(SUM(fs.total_students), 0) AS total_students";
      totalScannedSchoolSelect =
        "COUNT(DISTINCT CASE WHEN sa.total_scanned > 0 THEN fs.school_udise_code END) AS total_scanned_school";
      break;
  }

  let subjectsForSchoolCTE = "";
  if (effectiveCategory === "subject_breakdown") {
    const subjectFilterValues = [];
    let subjectMstWhere = [];
    if (class_level) {
      subjectMstWhere.push(
        `ms.class_level = $${values.length + subjectFilterValues.length + 1}`
      );
      subjectFilterValues.push(String(class_level));
    } else if (effectiveClassLevels.length > 0) {
      subjectMstWhere.push(
        `ms.class_level = ANY(ARRAY[${effectiveClassLevels
          .map(
            (_, i) => `$${values.length + subjectFilterValues.length + 1 + i}`
          )
          .join(",")}])`
      );
      subjectFilterValues.push(...effectiveClassLevels.map(String));
    }
    if (medium) {
      subjectMstWhere.push(
        `ms.medium = $${values.length + subjectFilterValues.length + 1}`
      );
      subjectFilterValues.push(medium);
    }
    if (subject) {
      subjectMstWhere.push(
        `ms.id = $${values.length + subjectFilterValues.length + 1}`
      );
      subjectFilterValues.push(subject);
    }

    subjectsForSchoolCTE = `
            , subjects_for_school AS (
                SELECT DISTINCT ms.id AS subject_id, ms.name AS subject_name
                FROM public.mst_subjects ms
                WHERE 1=1 ${
                  subjectMstWhere.length > 0
                    ? `AND ${subjectMstWhere.join(" AND ")}`
                    : ""
                }
            )
        `;
    values.push(...subjectFilterValues);
  }

  const filteredSchoolsCTE = `
        WITH filtered_schools AS (
            SELECT DISTINCT ON (school_udise_code)
                school_udise_code,
                district_cd,
                block_cd,
                cluster_cd,
                tbc_school_type,
                total_students,
                school_name,
                class_1, class_2, class_3, class_4, class_5,
                class_6, class_7, class_8, class_9, class_10
            FROM (
                ${
                  school_type === "government"
                    ? ""
                    : `
                SELECT
                    sc.school_udise_code,
                    mc.district_cd,
                    mc.block_cd,
                    mc.cluster_cd,
                    sc.tbc_school_type,
                    sc.total_students,
                    sc.school_name,
                    sc.class_1, sc.class_2, sc.class_3, sc.class_4, sc.class_5,
                    sc.class_6, sc.class_7, sc.class_8, sc.class_9, sc.class_10
                FROM public.student_counts sc
                LEFT JOIN mst_schools as mc ON mc.udise_sch_code = sc.school_udise_code::bigint
                WHERE sc.school_udise_code IS NOT NULL
                    AND sc.school_udise_code > 0
                    ${schoolDataFilterClauseStudentCounts}
                ${
                  school_type && school_type !== "government"
                    ? `AND sc.tbc_school_type = $${values.length + 1}`
                    : ""
                }
                UNION
                `
                }
                SELECT
                    csc.udise_sch_code AS school_udise_code,
                    csc.district_cd,
                    csc.block_cd,
                    csc.cluster_cd,
                    ${schoolTypeMap.government} AS tbc_school_type,
                    (csc.class_1 + csc.class_2 + csc.class_3 + csc.class_4 + csc.class_5 +
                     csc.class_6 + csc.class_7 + csc.class_8) AS total_students,
                    csc.school_name,
                    csc.class_1, csc.class_2, csc.class_3, csc.class_4, csc.class_5,
                    csc.class_6, csc.class_7, csc.class_8,
                    0 AS class_9, 0 AS class_10
                FROM public.cluster_student_count csc
                LEFT JOIN mst_schools as mc ON mc.udise_sch_code = csc.udise_sch_code
                WHERE csc.udise_sch_code IS NOT NULL
                    AND csc.udise_sch_code > 0
                    ${schoolDataFilterClauseClusterStudentCount}
            ) AS fs
            ${
              school_type &&
              school_type !== "government" &&
              Number.isInteger(schoolTypeMap[school_type])
                ? `WHERE fs.tbc_school_type = $${values.length + 1}`
                : ""
            }
        )
    `;
  if (
    school_type &&
    school_type !== "government" &&
    Number.isInteger(schoolTypeMap[school_type])
  ) {
    values.push(schoolTypeMap[school_type]);
  }

  const query = `
        ${filteredSchoolsCTE}
        ${clustersCTE}
        ${subjectsForSchoolCTE}
        , school_distributed_agg AS (
            SELECT
                fs.cluster_cd,
                tscb.udise_code,
                ${
                  effectiveCategory === "subject_breakdown"
                    ? "ms.id AS subject_id,"
                    : ""
                }
                COALESCE(SUM(tscb.quantity), 0) AS total_quantity
            FROM public.tbc_school_challan_books tscb
            ${commonBookJoinAndFilters}
            JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
            GROUP BY fs.cluster_cd, tscb.udise_code ${
              effectiveCategory === "subject_breakdown" ? ", ms.id" : ""
            }
        )
        , distributed_agg AS (
            SELECT
                fs.cluster_cd,
                tscb.udise_code,
                ${
                  effectiveCategory === "subject_breakdown"
                    ? "ms.id AS subject_id,"
                    : ""
                }
                COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
            FROM public.tbc_school_challan_books tscb
            ${commonBookJoinAndFilters}
            JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
            GROUP BY fs.cluster_cd, tscb.udise_code ${
              effectiveCategory === "subject_breakdown" ? ", ms.id" : ""
            }
        )
        , scanned_agg AS (
            SELECT
                fs.cluster_cd,
                tbt.udise_code,
                ${
                  effectiveCategory === "subject_breakdown"
                    ? "ms.id AS subject_id,"
                    : ""
                }
                COALESCE(COUNT(*), 0) AS total_scanned
            FROM public.tbc_book_tracking tbt
            ${scannedBookJoinAndFilters}
            JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
            GROUP BY fs.cluster_cd, tbt.udise_code ${
              effectiveCategory === "subject_breakdown" ? ", ms.id" : ""
            }
        )
        SELECT
            ${selectGroupByCols ? `${selectGroupByCols},` : ""}
            COALESCE(SUM(sda.total_quantity), 0) AS school_distributed,
            COALESCE(SUM(da.total_distributed), 0) AS student_distributed,
            COALESCE(SUM(sa.total_scanned), 0) AS total_scanned,
            COALESCE(SUM(sa.total_scanned), 0) - COALESCE(SUM(da.total_distributed), 0) AS scanned_but_not_distributed,
            COALESCE(SUM(sda.total_quantity), 0) - COALESCE(SUM(sa.total_scanned), 0) AS not_scanned,
            ${finalSelectTotalSchools}
            ${totalScannedSchoolSelect},
            ${finalSelectTotalStudents}
        FROM ${
          effectiveCategory === "cluster"
            ? "clusters_in_block mcl LEFT JOIN filtered_schools fs ON fs.cluster_cd::BIGINT = mcl.cluster_cd"
            : "filtered_schools fs"
        }
        ${masterTableJoins.join(" ")}
        ${
          effectiveCategory === "subject_breakdown"
            ? `CROSS JOIN subjects_for_school sfs
                    LEFT JOIN school_distributed_agg sda
                        ON fs.school_udise_code = sda.udise_code
                        AND sfs.subject_id = sda.subject_id
                    LEFT JOIN distributed_agg da
                        ON fs.school_udise_code = da.udise_code
                        AND sfs.subject_id = da.subject_id
                    LEFT JOIN scanned_agg sa
                        ON fs.school_udise_code = sa.udise_code
                        AND sfs.subject_id = sa.subject_id`
            : `LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
                    LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
                    LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code`
        }
        ${groupByClause}
        ${orderByClause ? `ORDER BY ${orderByClause}` : ""};
    `;
  return { query, values };
};

const formatResponse = (responseData, filterData) => {
  const {
    effectiveCategory,
    udise_code,
    class_level,
    class_category,
    effectiveClassLevels,
  } = filterData;

  const convertNumbersToStrings = (obj) => {
    for (const key in obj) {
      if (
        typeof obj[key] === "number" &&
        key !== "school_udise_code" &&
        key !== "cluster_cd"
      ) {
        obj[key] = String(obj[key]);
      }
    }
    return obj;
  };

  let finalResponse;

  if (effectiveCategory === "school_classes_all" && udise_code) {
    finalResponse = { data: [], total: {} };
    if (responseData.length > 0) {
      const schoolInfo = responseData[0];
      const totalSummary = {
        school_distributed: parseInt(schoolInfo.school_distributed),
        student_distributed: parseInt(schoolInfo.student_distributed),
        total_scanned: parseInt(schoolInfo.total_scanned),
        scanned_but_not_distributed: parseInt(
          schoolInfo.scanned_but_not_distributed
        ),
        not_scanned: parseInt(schoolInfo.not_scanned),
        total_students: parseInt(schoolInfo.total_students),
        total_schools: parseInt(schoolInfo.total_schools),
        total_scanned_school: parseInt(schoolInfo.total_scanned_school),
      };
      finalResponse.total = convertNumbersToStrings(totalSummary);

      let classesToIterate = [];
      if (class_level) {
        classesToIterate.push(class_level);
      } else if (class_category) {
        classesToIterate = effectiveClassLevels;
      } else {
        classesToIterate = Array.from({ length: 10 }, (_, i) => i + 1);
      }

      for (const cls of classesToIterate) {
        const classKey = `class_${cls}`;
        if (schoolInfo[`${classKey}_students`] !== undefined) {
          finalResponse.data.push({
            [`class_${cls}`]: {
              school_udise_code: String(schoolInfo.school_udise_code),
              school_name: schoolInfo.school_name,
              school_distributed: String(
                parseInt(schoolInfo.school_distributed)
              ),
              student_distributed: String(
                parseInt(schoolInfo.student_distributed)
              ),
              total_scanned: String(parseInt(schoolInfo.total_scanned)),
              scanned_but_not_distributed: String(
                parseInt(schoolInfo.scanned_but_not_distributed)
              ),
              not_scanned: String(parseInt(schoolInfo.not_scanned)),
              total_students: String(
                parseInt(schoolInfo[`${classKey}_students`] || 0)
              ),
              total_scanned_school: String(
                parseInt(schoolInfo.total_scanned_school)
              ),
            },
          });
        }
      }
    } else {
      finalResponse = {
        data: [],
        total: {
          school_distributed: "0",
          student_distributed: "0",
          total_scanned: "0",
          scanned_but_not_distributed: "0",
          not_scanned: "0",
          total_students: "0",
          total_schools: "0",
          total_scanned_school: "0",
        },
      };
    }
  } else if (
    effectiveCategory === "subject_breakdown" &&
    udise_code &&
    (class_level || class_category)
  ) {
    finalResponse = {
      data: [],
      total: {
        school_distributed: 0,
        student_distributed: 0,
        total_scanned: 0,
        scanned_but_not_distributed: 0,
        not_scanned: 0,
        total_students: 0,
        total_schools: 0,
        total_scanned_school: 0,
      },
    };
    if (responseData.length > 0) {
      const schoolInfoForTotals = responseData[0];
      finalResponse.total.total_students = parseInt(
        schoolInfoForTotals.total_students || 0
      );
      finalResponse.total.total_schools = parseInt(
        schoolInfoForTotals.total_schools || 0
      );
      finalResponse.total.total_scanned_school = parseInt(
        schoolInfoForTotals.total_scanned_school || 0
      );
    }

    responseData.forEach((row) => {
      finalResponse.total.school_distributed += parseInt(
        row.school_distributed || 0
      );
      finalResponse.total.student_distributed += parseInt(
        row.student_distributed || 0
      );
      finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
      finalResponse.total.scanned_but_not_distributed += parseInt(
        row.scanned_but_not_distributed || 0
      );
      finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);

      finalResponse.data.push({
        [row.subject_name]: {
          school_udise_code: String(row.school_udise_code),
          school_name: row.school_name,
          school_distributed: String(parseInt(row.school_distributed || 0)),
          student_distributed: String(parseInt(row.student_distributed || 0)),
          total_scanned: String(parseInt(row.total_scanned || 0)),
          scanned_but_not_distributed: String(
            parseInt(row.scanned_but_not_distributed || 0)
          ),
          not_scanned: String(parseInt(row.not_scanned || 0)),
          total_students: String(parseInt(row.total_students || 0)),
          total_scanned_school: String(parseInt(row.total_scanned_school || 0)),
        },
      });
    });

    finalResponse.total = convertNumbersToStrings(finalResponse.total);
  } else if (
    effectiveCategory === "class_level_summary" &&
    (class_level || class_category)
  ) {
    finalResponse = { data: [], total: {} };
    if (responseData.length > 0) {
      const totalSummary = responseData.reduce((acc, current) => {
        acc.school_distributed =
          (acc.school_distributed || 0) +
          parseInt(current.school_distributed || 0);
        acc.student_distributed =
          (acc.student_distributed || 0) +
          parseInt(current.student_distributed || 0);
        acc.total_scanned =
          (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
        acc.scanned_but_not_distributed =
          (acc.scanned_but_not_distributed || 0) +
          parseInt(current.scanned_but_not_distributed || 0);
        acc.not_scanned =
          (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
        acc.total_students =
          (acc.total_students || 0) + parseInt(current.total_students || 0);
        acc.total_schools =
          (acc.total_schools || 0) + parseInt(current.total_schools || 0);
        acc.total_scanned_school =
          (acc.total_scanned_school || 0) +
          parseInt(current.total_scanned_school || 0);
        return acc;
      }, {});
      finalResponse.total = convertNumbersToStrings(totalSummary);

      if (class_level) {
        finalResponse.data = responseData.map((row) => ({
          level: `Class ${class_level}`,
          total_students: String(row.total_students),
          total_schools: String(row.total_schools),
          total_scanned_school: String(row.total_scanned_school),
          school_distributed: String(row.school_distributed),
          student_distributed: String(row.student_distributed),
          total_scanned: String(row.total_scanned),
          scanned_but_not_distributed: String(row.scanned_but_not_distributed),
          not_scanned: String(row.not_scanned),
        }));
      } else if (class_category) {
        finalResponse.data = [
          {
            level:
              class_category.charAt(0).toUpperCase() + class_category.slice(1),
            total_students: String(finalResponse.total.total_students),
            total_schools: String(finalResponse.total.total_schools),
            total_scanned_school: String(
              finalResponse.total.total_scanned_school
            ),
            school_distributed: String(finalResponse.total.school_distributed),
            student_distributed: String(
              finalResponse.total.student_distributed
            ),
            total_scanned: String(finalResponse.total.total_scanned),
            scanned_but_not_distributed: String(
              finalResponse.total.scanned_but_not_distributed
            ),
            not_scanned: String(finalResponse.total.not_scanned),
          },
        ];
      }
    } else {
      finalResponse = {
        data: [],
        total: {
          school_distributed: "0",
          student_distributed: "0",
          total_scanned: "0",
          scanned_but_not_distributed: "0",
          not_scanned: "0",
          total_students: "0",
          total_schools: "0",
          total_scanned_school: "0",
        },
      };
    }
  } else if (effectiveCategory === "cluster") {
    finalResponse = {
      data: [],
      total: {
        school_distributed: 0,
        student_distributed: 0,
        total_scanned: 0,
        scanned_but_not_distributed: 0,
        not_scanned: 0,
        total_students: 0,
        total_schools: 0,
        total_scanned_school: 0,
      },
    };
    responseData.forEach((row) => {
      finalResponse.total.school_distributed += parseInt(
        row.school_distributed || 0
      );
      finalResponse.total.student_distributed += parseInt(
        row.student_distributed || 0
      );
      finalResponse.total.total_scanned += parseInt(row.total_scanned || 0);
      finalResponse.total.scanned_but_not_distributed += parseInt(
        row.scanned_but_not_distributed || 0
      );
      finalResponse.total.not_scanned += parseInt(row.not_scanned || 0);
      finalResponse.total.total_students += parseInt(row.total_students || 0);
      finalResponse.total.total_schools += parseInt(row.total_schools || 0);
      finalResponse.total.total_scanned_school += parseInt(
        row.total_scanned_school || 0
      );

      finalResponse.data.push({
        cluster_cd: String(row.cluster_cd),
        cluster_name: row.cluster_name,
        school_distributed: String(parseInt(row.school_distributed || 0)),
        student_distributed: String(parseInt(row.student_distributed || 0)),
        total_scanned: String(parseInt(row.total_scanned || 0)),
        scanned_but_not_distributed: String(
          parseInt(row.scanned_but_not_distributed || 0)
        ),
        not_scanned: String(parseInt(row.not_scanned || 0)),
        total_students: String(parseInt(row.total_students || 0)),
        total_schools: String(parseInt(row.total_schools || 0)),
        total_scanned_school: String(parseInt(row.total_scanned_school || 0)),
      });
    });

    finalResponse.total = convertNumbersToStrings(finalResponse.total);
  } else if (responseData.length > 0) {
    const totalSummary = responseData.reduce((acc, current) => {
      acc.school_distributed =
        (acc.school_distributed || 0) +
        parseInt(current.school_distributed || 0);
      acc.student_distributed =
        (acc.student_distributed || 0) +
        parseInt(current.student_distributed || 0);
      acc.total_scanned =
        (acc.total_scanned || 0) + parseInt(current.total_scanned || 0);
      acc.scanned_but_not_distributed =
        (acc.scanned_but_not_distributed || 0) +
        parseInt(current.scanned_but_not_distributed || 0);
      acc.not_scanned =
        (acc.not_scanned || 0) + parseInt(current.not_scanned || 0);
      acc.total_schools =
        (acc.total_schools || 0) + parseInt(current.total_schools || 0);
      acc.total_students =
        (acc.total_students || 0) + parseInt(current.total_students || 0);
      acc.total_scanned_school =
        (acc.total_scanned_school || 0) +
        parseInt(current.total_scanned_school || 0);
      return acc;
    }, {});
    finalResponse = {
      total: convertNumbersToStrings(totalSummary),
      data: responseData.map((row) => convertNumbersToStrings({ ...row })),
    };
  } else {
    finalResponse = {
      data: [],
      total: {
        school_distributed: "0",
        student_distributed: "0",
        total_scanned: "0",
        scanned_but_not_distributed: "0",
        not_scanned: "0",
        total_students: "0",
        total_schools: "0",
        total_scanned_school: "0",
      },
    };
  }

  return finalResponse;
};

const SchoolListReport = async (filters) => {
  try {
    const filterData = processSchoolListFilters(filters);
    const { query, values } = buildSchoolListSqlQuery(filterData);
    const result = await pool.query(query, values);
    const responseData = result.rows;

    return formatSchoolListResponse(responseData, filterData);
  } catch (error) {
    console.error("Error in SchoolListReport:", error);
    throw error;
  }
};

// Part 1: Filter Processing
const processSchoolListFilters = (filters) => {
  const { district_id, block_id, cluster_id, udise_code } = filters;

  return {
    district_id,
    block_id,
    cluster_id,
    udise_code,
  };
};

// Part 2: SQL Query Construction
const buildSchoolListSqlQuery = (filterData) => {
  const { district_id, block_id, cluster_id, udise_code } = filterData;

  const whereClauses = [];
  let values = [];

  // School-level filters for 'filtered_schools' CTE
  if (district_id) {
    whereClauses.push(
      `mc.district_cd::INTEGER = $${values.length + 1}::INTEGER`
    );
    values.push(district_id);
  }
  if (block_id) {
    whereClauses.push(`mc.block_cd::BIGINT = $${values.length + 1}::BIGINT`);
    values.push(block_id);
  }
  if (cluster_id) {
    whereClauses.push(`mc.cluster_cd::BIGINT = $${values.length + 1}::BIGINT`);
    values.push(cluster_id);
  }
  if (udise_code) {
    whereClauses.push(`sc.school_udise_code = $${values.length + 1}`);
    values.push(udise_code);
  }

  const schoolDataFilterClause =
    whereClauses.length > 0 ? `AND ${whereClauses.join(" AND ")}` : "";

  const query = `
        WITH filtered_schools AS (
            SELECT DISTINCT ON (sc.school_udise_code)
                sc.school_udise_code,
                sc.school_name,
                mc.district_cd,
                mdist.district_name,
                mc.block_cd,
                mb.block_name,
                mc.cluster_cd,
                mcl.cluster_name,
                sc.total_students
            FROM public.student_counts sc
            LEFT JOIN public.mst_schools mc ON mc.udise_sch_code = sc.school_udise_code::BIGINT
            LEFT JOIN public.mst_district mdist ON mc.district_cd::INTEGER = mdist.district_cd::INTEGER
            LEFT JOIN public.mst_block mb ON mc.block_cd::BIGINT = mb.block_cd::BIGINT
            LEFT JOIN public.mst_cluster mcl ON mc.cluster_cd::BIGINT = mcl.cluster_cd::BIGINT
            WHERE sc.school_udise_code IS NOT NULL
                AND sc.school_udise_code > 0
                ${schoolDataFilterClause}
        ),
        school_distributed_agg AS (
            SELECT
                tscb.udise_code,
                COALESCE(SUM(tscb.received_qty), 0) AS total_received
            FROM public.tbc_school_challan_books tscb
            JOIN public.tbc_books tb ON tscb.book_id = tb.id
            JOIN public.mst_subjects ms ON tb.subject_id = ms.id
            JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
            GROUP BY tscb.udise_code
        ),
        distributed_agg AS (
            SELECT
                tscb.udise_code,
                COALESCE(SUM(CAST(tscb.distributed_qty AS INTEGER)), 0) AS total_distributed
            FROM public.tbc_school_challan_books tscb
            JOIN public.tbc_books tb ON tscb.book_id = tb.id
            JOIN public.mst_subjects ms ON tb.subject_id = ms.id
            JOIN filtered_schools fs ON tscb.udise_code = fs.school_udise_code
            GROUP BY tscb.udise_code
        ),
        scanned_agg AS (
            SELECT
                tbt.udise_code,
                COALESCE(COUNT(*), 0) AS total_scanned
            FROM public.tbc_book_tracking tbt
            JOIN public.tbc_books tb ON tbt.book_id = tb.id
            JOIN public.mst_subjects ms ON tb.subject_id = ms.id
            JOIN filtered_schools fs ON tbt.udise_code = fs.school_udise_code
            GROUP BY tbt.udise_code
        )
        SELECT
            fs.district_cd,
            fs.district_name,
            ${block_id ? "fs.block_cd, fs.block_name," : ""}
            ${cluster_id ? "fs.cluster_cd, fs.cluster_name," : ""}
            fs.school_udise_code AS udise_code,
            fs.school_name,
            COALESCE(sda.total_received, 0) AS school_distributed,
            COALESCE(da.total_distributed, 0) AS student_distributed,
            COALESCE(sa.total_scanned, 0) AS total_scanned,
            COALESCE(sa.total_scanned, 0) - COALESCE(da.total_distributed, 0) AS scanned_but_not_distributed,
            COALESCE(sda.total_received, 0) - COALESCE(sa.total_scanned, 0) AS not_scanned,
            1 AS total_schools,
            CASE WHEN COALESCE(sa.total_scanned, 0) > 0 THEN 1 ELSE 0 END AS total_scanned_school,
            COALESCE(fs.total_students, 0) AS total_students
        FROM filtered_schools fs
        LEFT JOIN school_distributed_agg sda ON fs.school_udise_code = sda.udise_code
        LEFT JOIN distributed_agg da ON fs.school_udise_code = da.udise_code
        LEFT JOIN scanned_agg sa ON fs.school_udise_code = sa.udise_code
        ORDER BY fs.school_udise_code;
    `;

  return { query, values };
};

// Part 3: Response Formatting
const formatSchoolListResponse = (responseData, filterData) => {
  const { district_id, block_id, cluster_id, udise_code } = filterData;

  const convertNumbersToStrings = (obj) => {
    for (const key in obj) {
      if (
        typeof obj[key] === "number" &&
        key !== "udise_code" &&
        key !== "district_cd" &&
        key !== "block_cd" &&
        key !== "cluster_cd"
      ) {
        obj[key] = String(obj[key]);
      }
    }
    return obj;
  };

  const data = responseData.map((row) =>
    convertNumbersToStrings({
      district_cd: String(row.district_cd),
      district_name: row.district_name,
      ...(block_id && {
        block_cd: String(row.block_cd),
        block_name: row.block_name,
      }),
      ...(cluster_id && {
        cluster_cd: String(row.cluster_cd),
        cluster_name: row.cluster_name,
      }),
      udise_code: String(row.udise_code),
      school_name: row.school_name,
      school_distributed: String(row.school_distributed),
      student_distributed: String(row.student_distributed),
      total_scanned: String(row.total_scanned),
      scanned_but_not_distributed: String(row.scanned_but_not_distributed),
      not_scanned: String(row.not_scanned),
      total_schools: String(row.total_schools),
      total_scanned_school: String(row.total_scanned_school),
      total_students: String(row.total_students),
    })
  );

  const totalSummary = responseData.reduce(
    (acc, row) => {
      acc.school_distributed += parseInt(row.school_distributed || 0);
      acc.student_distributed += parseInt(row.student_distributed || 0);
      acc.total_scanned += parseInt(row.total_scanned || 0);
      acc.scanned_but_not_distributed += parseInt(
        row.scanned_but_not_distributed || 0
      );
      acc.not_scanned += parseInt(row.not_scanned || 0);
      acc.total_schools += parseInt(row.total_schools || 0);
      acc.total_scanned_school += parseInt(row.total_scanned_school || 0);
      acc.total_students += parseInt(row.total_students || 0);
      return acc;
    },
    {
      school_distributed: 0,
      student_distributed: 0,
      total_scanned: 0,
      scanned_but_not_distributed: 0,
      not_scanned: 0,
      total_schools: 0,
      total_scanned_school: 0,
      total_students: 0,
    }
  );

  return {
    data,
    total: convertNumbersToStrings(totalSummary),
  };
};

const getSchoolScanningReport = async (filter, category, type) => {
  let query;
  let queryParams = [];

  if (type && !["aatmanand", "pmshree", "cluster"].includes(type)) {
    throw new Error(
      'Invalid type. Use "aatmanand", "pmshree", "cluster" or omit the type parameter.'
    );
  }

  let schoolStats;
  let schoolStatsSelectColumns, schoolStatsGroupByColumns;

  if (filter === "district") {
    schoolStatsSelectColumns = "ms.district_name AS district, ms.district_cd";
    schoolStatsGroupByColumns = "ms.district_name, ms.district_cd";
  } else if (filter === "block") {
    schoolStatsSelectColumns =
      "ms.district_name AS district, ms.district_cd, ms.block_name, ms.block_cd";
    schoolStatsGroupByColumns =
      "ms.district_name, ms.district_cd, ms.block_name, ms.block_cd";
  } else if (filter === "cluster") {
    schoolStatsSelectColumns =
      "ms.district_name AS district, ms.district_cd, ms.block_name, ms.block_cd, ms.cluster_name, ms.cluster_cd";
    schoolStatsGroupByColumns =
      "ms.district_name, ms.district_cd, ms.block_name, ms.block_cd, ms.cluster_name, ms.cluster_cd";
  } else {
    throw new Error(
      'Invalid filter type. Use "district", "block", or "cluster".'
    );
  }

  let combinedSchoolsCTE = "";
  let schoolTypeFilter = "";
  let pmshriSagesFilter = "";

  if (type === "aatmanand" || category === "aatmanand") {
    schoolTypeFilter = `tbc_school_type = '1'`;
    pmshriSagesFilter = `pmshri_sages IN (2, 3)`;
  } else if (type === "pmshree" || category === "pmshree") {
    schoolTypeFilter = `tbc_school_type = '4'`;
    pmshriSagesFilter = `pmshri_sages IN (1, 3)`;
  }

  if (schoolTypeFilter && pmshriSagesFilter) {
    combinedSchoolsCTE = `
        WITH combined_schools AS (
          SELECT DISTINCT school_udise_code AS udise_code
          FROM public.student_counts
          WHERE ${schoolTypeFilter}
          UNION
          SELECT DISTINCT udise_sch_code AS udise_code
          FROM public.cluster_student_count
          WHERE ${pmshriSagesFilter}
        )
        `;
    schoolStats = `
        ${combinedSchoolsCTE}
        SELECT
          ${schoolStatsSelectColumns},
          COUNT(DISTINCT cs.udise_code) AS num_schools,
          ARRAY_AGG(DISTINCT cs.udise_code) AS udise_codes
        FROM mst_schools ms
        LEFT JOIN combined_schools cs
          ON ms.udise_sch_code::text = cs.udise_code::text
        WHERE cs.udise_code IS NOT NULL
        GROUP BY ${schoolStatsGroupByColumns}
        `;
  }

  if (!combinedSchoolsCTE) {
    if (category === "high") {
      schoolStats = `
            SELECT
              ${schoolStatsSelectColumns},
              COUNT(DISTINCT sc.school_udise_code) AS num_schools,
              ARRAY_AGG(DISTINCT sc.school_udise_code) AS udise_codes
            FROM mst_schools ms
            LEFT JOIN public.student_counts sc
              ON ms.district_cd::text = sc.district_cd::text
              AND (ms.block_cd::bigint = sc.block_cd::bigint OR sc.block_cd IS NULL)
              AND (ms.cluster_cd::bigint = sc.cluster_cd::bigint OR sc.cluster_cd IS NULL)
            WHERE sc.tbc_school_type = '2'
            GROUP BY ${schoolStatsGroupByColumns}
          `;
    } 
    else if (category === "primary") {
      schoolStats = `
            SELECT
              ${schoolStatsSelectColumns},
              COUNT(DISTINCT csc.udise_sch_code) AS num_schools,
              ARRAY_AGG(DISTINCT csc.udise_sch_code) AS udise_codes
            FROM mst_schools ms
            LEFT JOIN public.cluster_student_count csc
              ON ms.district_cd::text = csc.district_cd::text
              AND (ms.block_cd::bigint = csc.block_cd::bigint OR csc.block_cd IS NULL)
              AND (ms.cluster_cd::bigint = csc.cluster_cd::bigint OR csc.cluster_cd IS NULL)
              AND csc.sch_category_id IN (1,2,3,6)
            GROUP BY ${schoolStatsGroupByColumns}
          `;
    } else if (category === "middle") {
      schoolStats = `
            SELECT
              ${schoolStatsSelectColumns},
              COUNT(DISTINCT csc.udise_sch_code) AS num_schools,
              ARRAY_AGG(DISTINCT csc.udise_sch_code) AS udise_codes
            FROM mst_schools ms
            LEFT JOIN public.cluster_student_count csc
              ON ms.district_cd::text = csc.district_cd::text
              AND ms.block_cd::bigint = csc.block_cd::bigint
              AND ms.cluster_cd::bigint = csc.cluster_cd::bigint
              AND csc.sch_category_id IN (2,3,4,5,6,7)
            GROUP BY ${schoolStatsGroupByColumns}
          `;
    } else if (category === "cluster") {
      schoolStats = `
              SELECT
                ${schoolStatsSelectColumns},
                COUNT(DISTINCT csc.udise_sch_code) AS num_schools,
                ARRAY_AGG(DISTINCT csc.udise_sch_code) AS udise_codes
              FROM mst_schools ms
              LEFT JOIN public.cluster_student_count csc
                ON ms.district_cd::text = csc.district_cd::text
                AND (ms.block_cd::bigint = csc.block_cd::bigint OR csc.block_cd IS NULL)
                AND (ms.cluster_cd::bigint = csc.cluster_cd::bigint OR csc.cluster_cd IS NULL)
                AND csc.sch_category_id IN (1,2,3,4,5,6,7)
              GROUP BY ${schoolStatsGroupByColumns}
            `;
    } else if (category === "all") {
      let typeFilter = "";
      if (type === "aatmanand") {
        typeFilter = `WHERE tbc_school_type = '1'`;
        pmshriSagesFilter = `WHERE pmshri_sages IN (2, 3) AND sch_category_id IN (1,2,3,4,5,6,7)`;
      } else if (type === "pmshree") {
        typeFilter = `WHERE tbc_school_type = '4'`;
        pmshriSagesFilter = `WHERE pmshri_sages IN (1, 3) AND sch_category_id IN (1,2,3,4,5,6,7)`;
      } else {
        typeFilter = `WHERE tbc_school_type IN ('1', '2', '4')`;
        pmshriSagesFilter = `WHERE sch_category_id IN (1,2,3,4,5,6,7)`;
      }
      schoolStats = `
            WITH unique_udise AS (
              SELECT DISTINCT school_udise_code AS udise_code
              FROM public.student_counts
              ${typeFilter}
              UNION
              SELECT DISTINCT udise_sch_code AS udise_code
              FROM public.cluster_student_count
              ${pmshriSagesFilter}
            )
            SELECT
              ${schoolStatsSelectColumns},
              COUNT(DISTINCT uu.udise_code) AS num_schools,
              ARRAY_AGG(DISTINCT uu.udise_code) AS udise_codes
            FROM mst_schools ms
            LEFT JOIN unique_udise uu
              ON ms.udise_sch_code::text = uu.udise_code::text
            WHERE uu.udise_code IS NOT NULL
            GROUP BY ${schoolStatsGroupByColumns}
          `;
    } else {
      throw new Error(
        'Invalid category type. Use "high", "primary", "middle", "aatmanand", "pmshree", or "all".'
      );
    }
  }

  let clusterReceivedBooks = "";
  if (category === "high" && filter === "cluster") {
    clusterReceivedBooks = `
        SELECT 
          s.cluster_cd,
          SUM(ci.books) AS cluster_received_books
        FROM 
          challan_info ci
        INNER JOIN 
          mst_schools s ON ci.school_id = s.udise_sch_code
        WHERE ci.class_id IN (9, 10)
        GROUP BY 
          s.cluster_cd
        `;
  } else {
    clusterReceivedBooks = `
        SELECT 
          COALESCE(ci.cluster_cd, cci.clucd) AS cluster_cd,
          COALESCE(ci.total_books, 0) + COALESCE(cci.total_books, 0) AS cluster_received_books
        FROM
          (
              SELECT 
                  s.cluster_cd,
                  SUM(ci.books) AS total_books
              FROM 
                  challan_info ci
              INNER JOIN 
                  mst_schools s ON ci.school_id = s.udise_sch_code
              GROUP BY 
                  s.cluster_cd
          ) ci
        FULL OUTER JOIN
          (
              SELECT 
                  clucd,
                  SUM(books) AS total_books
              FROM 
                  cluster_challan_info
              GROUP BY 
                  clucd
          ) cci
        ON ci.cluster_cd = cci.clucd
        `;
  }
  const schoolRes = `
    SELECT
      tscb.udise_code,
      ms.district_name,
      ms.district_cd,
      ms.block_name,
      ms.block_cd,
      ms.cluster_name,
      ms.cluster_cd,
      SUM(tscb.quantity) AS total_quantity,
      SUM(tscb.received_qty) AS total_received_qty
    FROM tbc_school_challan_books tscb
    JOIN mst_schools ms ON ms.udise_sch_code::text = tscb.udise_code::text
    WHERE tscb.udise_code::bigint IN (
      SELECT unnest(udise_codes)::bigint FROM school_stats
    )
    GROUP BY tscb.udise_code, ms.district_name, ms.district_cd, ms.block_name, ms.block_cd, ms.cluster_name, ms.cluster_cd
    `;

  // const bookScan = `
  // SELECT
  //   udise_code,
  //   COUNT(id) AS scan_count
  // FROM tbc_book_tracking
  // WHERE scanned_yn = true
  //   AND udise_code::bigint IN (
  //     SELECT unnest(udise_codes)::bigint FROM school_stats
  //   )
  // GROUP BY udise_code
  // `;

  const bookScan = `
     SELECT
      bt.udise_code,
      COUNT(DISTINCT bt.id) AS scan_count
    FROM tbc_book_tracking bt
    ${
      category === "high"
        ? "JOIN challan_info ci ON bt.book_id = ci.book_id AND bt.udise_code = ci.school_id::bigint AND ci.class_id IN (9,10)"
        : ""
    }
    WHERE bt.scanned_yn = true
      AND bt.udise_code::bigint IN (
        SELECT unnest(udise_codes)::bigint FROM school_stats
      )
    GROUP BY bt.udise_code
    `;

const scanningSchools = `
    SELECT
      ${schoolStatsSelectColumns},
      COUNT(DISTINCT ms.udise_sch_code) AS schools_started_scanning
    FROM mst_schools ms
    JOIN tbc_book_tracking bt
      ON ms.udise_sch_code::text = bt.udise_code::text
    ${category === 'high' ? 'JOIN challan_info ci ON bt.book_id = ci.book_id AND bt.udise_code = ci.school_id::bigint AND ci.class_id IN (9,10)' : ''}
    WHERE bt.scanned_yn = true
      AND ms.udise_sch_code IN (
        SELECT unnest(udise_codes)::bigint FROM school_stats
      )
    GROUP BY ${schoolStatsGroupByColumns}
    `;

  let groupByBaseClause,
    selectClause,
    joinClauseForSchoolRes,
    joinClauseForScanningSchools,
    orderByColumnsForOuterQuery;

  if (filter === "district") {
    selectClause = "ss.district, ss.district_cd";
    groupByBaseClause = "ss.district, ss.district_cd";
    joinClauseForSchoolRes = "sr.district_cd::text = ss.district_cd::text";
    joinClauseForScanningSchools =
      "scs.district_cd::text = ss.district_cd::text";
    orderByColumnsForOuterQuery = "district";
  } else if (filter === "block") {
    selectClause = "ss.district, ss.district_cd, ss.block_name, ss.block_cd";
    groupByBaseClause =
      "ss.district, ss.district_cd, ss.block_name, ss.block_cd";
    joinClauseForSchoolRes =
      "sr.district_cd::text = ss.district_cd::text AND sr.block_cd::bigint = ss.block_cd::bigint";
    joinClauseForScanningSchools =
      "scs.district_cd::text = ss.district_cd::text AND scs.block_cd::bigint = ss.block_cd::bigint";
    orderByColumnsForOuterQuery = "district, block_cd, block_name";
  } else if (filter === "cluster") {
    selectClause =
      "ss.district, ss.district_cd, ss.block_name, ss.block_cd, ss.cluster_name, ss.cluster_cd";
    groupByBaseClause =
      "ss.district, ss.district_cd, ss.block_name, ss.block_cd, ss.cluster_name, ss.cluster_cd";
    joinClauseForSchoolRes =
      "sr.district_cd::text = ss.district_cd::text AND sr.block_cd::bigint = ss.block_cd::bigint AND sr.cluster_cd::bigint = ss.cluster_cd::bigint";
    joinClauseForScanningSchools =
      "scs.district_cd::text = ss.district_cd::text AND scs.block_cd::bigint = ss.block_cd::bigint AND scs.cluster_cd::bigint = ss.cluster_cd::bigint";
    orderByColumnsForOuterQuery = "district, block_name, cluster_name";
  }

  query = `
    WITH school_stats AS (${schoolStats}),
         school_res AS (${schoolRes}),
         book_scan AS (${bookScan}),
         scanning_schools AS (${scanningSchools})${
    filter === "cluster" ? "," : ""
  }
         ${
           filter === "cluster"
             ? `cluster_received AS (${clusterReceivedBooks})`
             : ""
         },
         calculated_data AS (
              SELECT
                  ${selectClause},
                  ss.num_schools AS no_of_schools,
                  COALESCE(SUM(COALESCE(sr.total_quantity, 0)), 0) AS books_given_to_schools,
                  COALESCE(SUM(COALESCE(sr.total_received_qty, 0)), 0) AS books_received_by_schools,
                  COALESCE(scs.schools_started_scanning, 0) AS no_of_schools_started_scanning,
                  COALESCE(SUM(COALESCE(bs.scan_count, 0)), 0) AS no_of_scanned_books,
                  ${
                    filter === "cluster"
                      ? "MAX(COALESCE(crb.cluster_received_books, 0)) AS cluster_received_books,"
                      : ""
                  }
                  CASE
                      WHEN ${
                        filter === "cluster"
                          ? "MAX(COALESCE(crb.cluster_received_books, 0))"
                          : "COALESCE(SUM(COALESCE(sr.total_quantity, 0)), 0)"
                      } = 0 THEN 0
                      ELSE ROUND(
                          (COALESCE(SUM(COALESCE(bs.scan_count, 0)), 0)::FLOAT /
                          ${
                            filter === "cluster"
                              ? "MAX(COALESCE(crb.cluster_received_books, 0))"
                              : "COALESCE(SUM(COALESCE(sr.total_quantity, 0)), 0)"
                          } * 100)::numeric, 3
                      )
                  END AS percentage_books_scanned
              FROM school_stats ss
              LEFT JOIN school_res sr ON ${joinClauseForSchoolRes}
              LEFT JOIN book_scan bs ON sr.udise_code = bs.udise_code
              LEFT JOIN scanning_schools scs ON ${joinClauseForScanningSchools}
              ${
                filter === "cluster"
                  ? "LEFT JOIN cluster_received crb ON ss.cluster_cd::bigint = crb.cluster_cd"
                  : ""
              }
              GROUP BY ${groupByBaseClause}, ss.num_schools, scs.schools_started_scanning${
    filter === "cluster" ? ", crb.cluster_cd" : ""
  }
          )
    SELECT
        ROW_NUMBER() OVER (ORDER BY percentage_books_scanned DESC, ${orderByColumnsForOuterQuery} ASC) AS sn,
        ${selectClause.replace(/ss\./g, "")},
        no_of_schools,
        books_given_to_schools,
        books_received_by_schools,
        no_of_schools_started_scanning,
        no_of_scanned_books,
        ${filter === "cluster" ? "cluster_received_books," : ""}
        percentage_books_scanned
    FROM calculated_data
    ORDER BY percentage_books_scanned DESC, ${orderByColumnsForOuterQuery} ASC;
    `;

  try {
    const { rows } = await pool.query(query, queryParams);

    let totals = {
      no_of_schools: 0,
      books_given_to_schools: 0,
      books_received_by_schools: 0,
      no_of_schools_started_scanning: 0,
      no_of_scanned_books: 0,
      percentage_books_scanned_sum: 0,
      ...(filter === "cluster" ? { cluster_received_books: 0 } : {}),
    };

    const formattedRows = rows.map((row) => {
      const parsedRow = {
        sn: parseInt(row.sn),
        district: row.district,
        no_of_schools: parseInt(row.no_of_schools),
        books_given_to_schools: parseInt(row.books_given_to_schools),
        books_received_by_schools: parseInt(row.books_received_by_schools),
        no_of_schools_started_scanning: parseInt(
          row.no_of_schools_started_scanning
        ),
        no_of_scanned_books: parseInt(row.no_of_scanned_books),
        ...(filter === "cluster"
          ? { cluster_received_books: parseInt(row.cluster_received_books) }
          : {}),
        percentage_books_scanned: parseFloat(row.percentage_books_scanned),
      };

      if (["block", "cluster"].includes(filter)) {
        parsedRow.block_name = row.block_name;
        parsedRow.block_cd = row.block_cd;
      }
      if (filter === "cluster") {
        parsedRow.cluster_name = row.cluster_name;
        parsedRow.cluster_cd = row.cluster_cd;
      }

      totals.no_of_schools += parsedRow.no_of_schools;
      totals.books_given_to_schools += parsedRow.books_given_to_schools;
      totals.books_received_by_schools += parsedRow.books_received_by_schools;
      totals.no_of_schools_started_scanning +=
        parsedRow.no_of_schools_started_scanning;
      totals.no_of_scanned_books += parsedRow.no_of_scanned_books;
      totals.percentage_books_scanned_sum += parsedRow.percentage_books_scanned;
      if (filter === "cluster") {
        totals.cluster_received_books += parsedRow.cluster_received_books;
      }

      return parsedRow;
    });

    const averagePercentage =
      filter === "cluster"
        ? totals.cluster_received_books === 0
          ? 0
          : (
              (totals.no_of_scanned_books / totals.cluster_received_books) *
              100
            ).toFixed(3)
        : totals.books_given_to_schools === 0
        ? 0
        : (
            (totals.no_of_scanned_books / totals.books_given_to_schools) *
            100
          ).toFixed(3);

    const finalTotals = {
      no_of_schools: totals.no_of_schools,
      books_given_to_schools: totals.books_given_to_schools,
      books_received_by_schools: totals.books_received_by_schools,
      no_of_schools_started_scanning: totals.no_of_schools_started_scanning,
      no_of_scanned_books: totals.no_of_scanned_books,
      ...(filter === "cluster"
        ? { cluster_received_books: totals.cluster_received_books }
        : {}),
      percentage_books_scanned_avg: parseFloat(averagePercentage),
    };

    return {
      data: formattedRows,
      total: finalTotals,
    };
  } catch (error) {
    console.error("Database query failed:", error.message);
    throw new Error(`Database query failed: ${error.message}`);
  }
};

module.exports = {
  getDepotList,
  getDepotDistrictList,
  fetchStudentBookDistributionReport,
  getCardCounts,
  BookDistributionReportDetails,
  SchoolListReport,
  getSchoolScanningReport,
};
