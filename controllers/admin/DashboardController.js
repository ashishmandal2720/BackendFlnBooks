const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getVerfiedUsersCount = async (req, res) => {
  try {
    const { district_cd, block_cd, cluster_cd } = req.query;
    let filterLevel = null;
    let filterParams = [];
    let paramIndexDistrict = "";
    let paramIndexBlock = "";
    let paramIndexCluster = "";

    if (cluster_cd && block_cd && district_cd) {
      filterLevel = "cluster";
      filterParams = [district_cd, block_cd, cluster_cd];
      paramIndexDistrict = "$1";
      paramIndexBlock = "$2";
      paramIndexCluster = "$3";
    } else if (block_cd && district_cd) {
      filterLevel = "block";
      filterParams = [district_cd, block_cd];
      paramIndexDistrict = "$1";
      paramIndexBlock = "$2";
    } else if (district_cd) {
      filterLevel = "district";
      filterParams = [district_cd];
      paramIndexDistrict = "$1";
    }

    const query = `
    SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u 
     ${
       filterLevel === "district" ||
       filterLevel === "block" ||
       filterLevel === "cluster"
         ? `inner join mst_deo md on u.column_value = md.district_cd::TEXT    AND md.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE u.role_id = 4) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_deo t 
     WHERE 
      ${
        filterLevel === "district" ||
        filterLevel === "block" ||
        filterLevel === "cluster"
          ? `t.district_cd = ${paramIndexDistrict} and `
          : ""
      }
     NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.district_cd::TEXT  
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 4


     UNION ALL

SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u 
     ${
       filterLevel === "block" || filterLevel === "cluster"
         ? `inner join mst_beo mb on u.column_value = mb.block_cd::TEXT    and mb.block_cd = ${paramIndexBlock} AND mb.district_cd = ${paramIndexDistrict}`
         : filterLevel === "district"
         ? `inner join mst_beo mb on u.column_value = mb.block_cd::TEXT    AND mb.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE u.role_id = 5) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_beo t 
     WHERE
      ${
        filterLevel === "block" || filterLevel === "cluster"
          ? `t.block_cd = ${paramIndexBlock} AND t.district_cd = ${paramIndexDistrict} and `
          : filterLevel === "district"
          ? `t.district_cd = ${paramIndexDistrict} and `
          : ""
      }
      NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.block_cd::TEXT  
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 5

    
     UNION ALL
SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u 
     ${
       filterLevel === "cluster"
         ? `inner join mst_cac mc on u.column_value = mc.cluster_cd::TEXT   and mc.cluster_cd = ${paramIndexCluster} AND mc.block_cd = ${paramIndexBlock} AND mc.district_cd = ${paramIndexDistrict}`
         : filterLevel === "block"
         ? `inner join mst_cac mc on u.column_value = mc.cluster_cd::TEXT   and mc.block_cd = ${paramIndexBlock} AND mc.district_cd = ${paramIndexDistrict}`
         : filterLevel === "district"
         ? `inner join mst_cac mc on u.column_value = mc.cluster_cd::TEXT   AND mc.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE u.role_id = 6) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_cac t 
     WHERE
     ${
       filterLevel === "cluster"
         ? `t.cluster_cd = ${paramIndexCluster} AND t.block_cd = ${paramIndexBlock} AND t.district_cd = ${paramIndexDistrict} and `
         : filterLevel === "block"
         ? `t.block_cd = ${paramIndexBlock} AND t.district_cd = ${paramIndexDistrict} and `
         : filterLevel === "district"
         ? `t.district_cd = ${paramIndexDistrict} and `
         : ""
     }
      NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.cluster_cd::TEXT  
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 6

      UNION ALL

SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u 
     WHERE u.role_id = 9
     ${
       filterLevel === "district" ||
       filterLevel === "block" ||
       filterLevel === "cluster"
         ? `and column_value = ${paramIndexDistrict}::TEXT`
         : ""
     }
     ) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_programmers t 
     WHERE
     ${
       filterLevel === "district" ||
       filterLevel === "block" ||
       filterLevel === "cluster"
         ? `district_cd = ${paramIndexDistrict} and`
         : ""
     }
      NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.contact_number = t.mobile::TEXT
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 9


     UNION ALL

SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u inner join mst_schools ms on u.column_value =  ms.udise_sch_code::TEXT
     ${
       filterLevel === "cluster"
         ? `and ms.cluster_cd = ${paramIndexCluster} AND ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "block"
         ? `and ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "district"
         ? `and ms.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE u.role_id = 7) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_schools t 
     WHERE
     ${
       filterLevel === "cluster"
         ? `t.cluster_cd = ${paramIndexCluster} AND t.block_cd = ${paramIndexBlock} AND t.district_cd = ${paramIndexDistrict} and`
         : filterLevel === "block"
         ? `t.block_cd = ${paramIndexBlock} AND t.district_cd = ${paramIndexDistrict} and`
         : filterLevel === "district"
         ? `t.district_cd = ${paramIndexDistrict} and`
         : ""
     }
      NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.udise_sch_code::TEXT  
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 7


     UNION ALL
    
    SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u 
     ${
       filterLevel === "cluster"
         ? `inner join mst_teacher mt on u.column_value = mt.teacher_code inner join mst_schools ms on mt.udise_id = ms.udise_sch_code and ms.cluster_cd = ${paramIndexCluster} AND ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "block"
         ? `inner join mst_teacher mt on u.column_value = mt.teacher_code inner join mst_schools ms on mt.udise_id = ms.udise_sch_code and ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "district"
         ? `inner join mst_teacher mt on u.column_value = mt.teacher_code inner join mst_schools ms on mt.udise_id = ms.udise_sch_code and ms.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE u.role_id = 8) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_teacher t 
      ${
        filterLevel === "cluster"
          ? `inner join mst_schools ms on t.udise_id = ms.udise_sch_code and ms.cluster_cd = ${paramIndexCluster} AND ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
          : filterLevel === "block"
          ? `inner join mst_schools ms on t.udise_id = ms.udise_sch_code and ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
          : filterLevel === "district"
          ? `inner join mst_schools ms on t.udise_id = ms.udise_sch_code and ms.district_cd = ${paramIndexDistrict}`
          : ""
      }
     WHERE NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.teacher_code
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 8

UNION ALL

SELECT 
    r.role_name,
    (SELECT COUNT(*) 
     FROM public.mst_users u inner join  mst_udise_teacher t on u.column_value = t.nat_tch_id inner join mst_schools ms on t.udise_sch_code = ms.udise_sch_code
    ${
      filterLevel === "cluster"
        ? `and ms.cluster_cd = ${paramIndexCluster} AND ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
        : filterLevel === "block"
        ? `and ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
        : filterLevel === "district"
        ? `and ms.district_cd = ${paramIndexDistrict}`
        : ""
    }
     WHERE u.role_id = 10) AS registered,
    (SELECT COUNT(*) 
     FROM public.mst_udise_teacher t inner join mst_schools ms on t.udise_sch_code = ms.udise_sch_code and ms.sch_mgmt_id in (4,5,97,98)
     ${
       filterLevel === "cluster"
         ? `and ms.cluster_cd = ${paramIndexCluster} AND ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "block"
         ? `and ms.block_cd = ${paramIndexBlock} AND ms.district_cd = ${paramIndexDistrict}`
         : filterLevel === "district"
         ? `and ms.district_cd = ${paramIndexDistrict}`
         : ""
     }
     WHERE NOT EXISTS (
         SELECT 1 
         FROM public.mst_users u 
         WHERE u.column_value = t.nat_tch_id
     )) AS unregistered
FROM 
    public.mst_roles r
WHERE 
    r.role_id = 10;

  

     
`;
    const usersCount = await pool.query(query, filterParams);
    responseHandler(res, 200, "Users fetched", usersCount.rows);
  } catch (error) {
    console.log(error);

    responseHandler(res, 400, "Error Fetching Data", null, error);
  }
};

const getVerfiedUserStats = async (req, res) => {
  try {
    const { role_id, district_cd, block_cd, cluster_cd } = req.query;
    let filterLevel = null;
    let filterParams = [];
    let paramIndexDistrict = "";
    let paramIndexBlock = "";
    let paramIndexCluster = "";

    // Determine filter level (but we'll adjust filterParams per role)
    if (cluster_cd && block_cd && district_cd) {
      filterLevel = "cluster";
    } else if (block_cd && district_cd) {
      filterLevel = "block";
    } else if (district_cd) {
      filterLevel = "district";
    }

    if (role_id == 4) {
      // DEO - only uses district_cd
      if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const query = `
        SELECT 
          md.district_name as name,
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_deo md
        LEFT JOIN mst_users mu
          ON mu.table_name = 'mst_deo'
          AND mu.column_value = md.district_cd::text
        ${district_cd ? `WHERE md.district_cd = ${paramIndexDistrict}` : ""}
        GROUP BY md.district_cd , md.district_name
        ORDER BY md.district_name;
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "Users fetched", usersCount.rows);
    } else if (role_id == 5) {
      if (block_cd && district_cd) {
        filterParams = [district_cd, block_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
      } else if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const whereClause =
        block_cd && district_cd
          ? `WHERE mb.district_cd = ${paramIndexDistrict} AND mb.block_cd = ${paramIndexBlock}`
          : district_cd
          ? `WHERE mb.district_cd = ${paramIndexDistrict}`
          : "";

      const groupByClause = district_cd ? "mb.block_cd , mb.block_name" : "mb.district_cd , mb.district_name";

      const selectClause = district_cd
        ? "mb.block_name as name"
        : "mb.district_name as name";

      const query = `
        SELECT 
          ${selectClause},
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_beo mb
        LEFT JOIN mst_users mu
          ON mu.table_name = 'mst_beo'
          AND mu.column_value = mb.block_cd::text
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupByClause};
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "Users fetched", usersCount.rows);
    } else if (role_id == 6) {
      if (cluster_cd && block_cd && district_cd) {
        filterParams = [district_cd, block_cd, cluster_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
        paramIndexCluster = "$3";
      } else if (block_cd && district_cd) {
        filterParams = [district_cd, block_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
      } else if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const whereClause =
        cluster_cd && block_cd && district_cd
          ? `WHERE mc.district_cd = ${paramIndexDistrict} AND mc.block_cd = ${paramIndexBlock} AND mc.cluster_cd = ${paramIndexCluster}`
          : block_cd && district_cd
          ? `WHERE mc.district_cd = ${paramIndexDistrict} AND mc.block_cd = ${paramIndexBlock}`
          : district_cd
          ? `WHERE mc.district_cd = ${paramIndexDistrict}`
          : "";

      const groupByClause =
        block_cd && district_cd
          ? "mc.cluster_cd , mc.cluster_name"
          : district_cd
          ? "mc.block_cd , mc.block_name"
          : "mc.district_cd ,mc.district_name";

      const selectClause =
        block_cd && district_cd
          ? "mc.cluster_name as name"
          : district_cd
          ? "mc.block_name as name"
          : "mc.district_name as name";

      const query = `
        SELECT 
          ${selectClause},
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_cac mc
        LEFT JOIN mst_users mu
          ON mu.table_name = 'mst_cac'
          AND mu.column_value = mc.cluster_cd::text
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupByClause};
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "CAC users fetched", usersCount.rows);
    } else if (role_id == 7) {
      // Schools - similar to CAC
      if (cluster_cd && block_cd && district_cd) {
        filterParams = [district_cd, block_cd, cluster_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
        paramIndexCluster = "$3";
      } else if (block_cd && district_cd) {
        filterParams = [district_cd, block_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
      } else if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const whereClause =
        cluster_cd && block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock} AND ms.cluster_cd = ${paramIndexCluster}`
          : block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock}`
          : district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict}`
          : "";

      const groupByClause =
        block_cd && district_cd
          ? "ms.cluster_cd , ms.cluster_name"
          : district_cd
          ? "ms.block_cd , ms.block_name"
          : "ms.district_cd , ms.district_name";

      const selectClause =
        block_cd && district_cd
          ? "ms.cluster_name as name"
          : district_cd
          ? "ms.block_name as name"
          : "ms.district_name as name";

      const query = `
        SELECT 
          ${selectClause},
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_schools ms
        LEFT JOIN mst_users mu
          ON mu.table_name = 'mst_schools'
          AND mu.column_name = 'udise_sch_code'
          AND mu.column_value = ms.udise_sch_code::text
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupByClause};
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "School users fetched", usersCount.rows);
    } else if (role_id == 8) {
      // Teachers - similar to Schools
      if (cluster_cd && block_cd && district_cd) {
        filterParams = [district_cd, block_cd, cluster_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
        paramIndexCluster = "$3";
      } else if (block_cd && district_cd) {
        filterParams = [district_cd, block_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
      } else if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const whereClause =
        cluster_cd && block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock} AND ms.cluster_cd = ${paramIndexCluster}`
          : block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock}`
          : district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict}`
          : "";

      const selectClause =
        block_cd && district_cd
          ? "ms.cluster_name AS name"
          : district_cd
          ? "ms.block_name AS name"
          : "ms.district_name AS name";

      const groupByClause =
        block_cd && district_cd
          ? "ms.cluster_cd , ms.cluster_name"
          : district_cd
          ? "ms.block_cd , ms.block_name"
          : "ms.district_cd ,ms.district_name";

      const query = `
        SELECT 
          ${selectClause},
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_teacher mt
        JOIN mst_schools ms ON mt.current_udise_id = ms.udise_sch_code
        LEFT JOIN mst_users mu 
          ON mu.table_name = 'mst_teacher'
          AND mu.column_value = mt.teacher_code
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupByClause};
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "Teacher users fetched", usersCount.rows);
    } else if (role_id == 9) {
      // District programmers - only uses district_cd
      if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const query = `
        SELECT 
          TRIM(md.district_name) AS name,
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_programmers md
        LEFT JOIN mst_users mu
          ON 
           mu.contact_number = md.mobile::text
        ${district_cd ? `WHERE md.district_cd = ${paramIndexDistrict}` : ""}
        GROUP BY TRIM(md.district_name)
        ORDER BY TRIM(md.district_name);
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(res, 200, "Programmer users fetched", usersCount.rows);
    } else if (role_id == 10) {
      // Private teachers - similar to regular teachers
      if (cluster_cd && block_cd && district_cd) {
        filterParams = [district_cd, block_cd, cluster_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
        paramIndexCluster = "$3";
      } else if (block_cd && district_cd) {
        filterParams = [district_cd, block_cd];
        paramIndexDistrict = "$1";
        paramIndexBlock = "$2";
      } else if (district_cd) {
        filterParams = [district_cd];
        paramIndexDistrict = "$1";
      }

      const whereClause =
        cluster_cd && block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock} AND ms.cluster_cd = ${paramIndexCluster}`
          : block_cd && district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock}`
          : district_cd
          ? `WHERE ms.district_cd = ${paramIndexDistrict}`
          : "";

      const selectClause =
        block_cd && district_cd
          ? "ms.cluster_name AS name"
          : district_cd
          ? "ms.block_name AS name"
          : "ms.district_name AS name";

      const groupByClause =
        block_cd && district_cd
          ? "ms.cluster_cd , ms.cluster_name"
          : district_cd
          ? "ms.block_cd ,ms.block_name"
          : "ms.district_cd , ms.district_name";

      const query = `
        SELECT 
          ${selectClause},
          COUNT(mu.user_id) AS registered,
          COUNT(*) - COUNT(mu.user_id) AS unregistered
        FROM mst_udise_teacher mt
        JOIN mst_schools ms ON ms.udise_sch_code = mt.udise_sch_code and ms.sch_mgmt_id in (4,5,97,98)
        LEFT JOIN mst_users mu 
          ON mu.table_name = 'mst_udise_teacher'
          AND mu.column_value = mt.nat_tch_id
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${groupByClause};
      `;

      const usersCount = await pool.query(query, filterParams);
      responseHandler(
        res,
        200,
        "Private teacher users fetched",
        usersCount.rows
      );
    }
  } catch (error) {
    console.log(error);
    responseHandler(res, 400, "Error Fetching Data", null, error);
  }
};

const getVerfiedUserStatsList = async (req, res) => {
  try {
    const {
      role_id,
      district_cd,
      block_cd,
      cluster_cd,
      page = 1,
      limit = 10,
      status,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    // Validate page and limit to be positive integers
    if (isNaN(parsedPage) || parsedPage < 1) {
      return responseHandler(
        res,
        400,
        "Invalid page number. Page must be a positive integer."
      );
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return responseHandler(
        res,
        400,
        "Invalid limit number. Limit must be a positive integer."
      );
    }

    // Validate status if provided
    if (status && !["registered", "unregistered"].includes(status)) {
      return responseHandler(
        res,
        400,
        "Invalid status. Status must be 'registered' or 'unregistered'."
      );
    }

    const offset = (parsedPage - 1) * parsedLimit;

    let filterLevel = null;
    let filterParams = [];
    let paramIndexDistrict = "";
    let paramIndexBlock = "";
    let paramIndexCluster = "";

    // Determine filter level and prepare parameters for WHERE clauses
    if (cluster_cd && block_cd && district_cd) {
      filterLevel = "cluster";
      filterParams = [district_cd, block_cd, cluster_cd];
      paramIndexDistrict = "$1";
      paramIndexBlock = "$2";
      paramIndexCluster = "$3";
    } else if (block_cd && district_cd) {
      filterLevel = "block";
      filterParams = [district_cd, block_cd];
      paramIndexDistrict = "$1";
      paramIndexBlock = "$2";
    } else if (district_cd) {
      filterLevel = "district";
      filterParams = [district_cd];
      paramIndexDistrict = "$1";
    }

    let query = "";
    let countQuery = "";
    let orderBy = "";
    let baseTable = "";
    let baseTableAlias = "";
    let joinClause = "";
    let countJoinClause = ""; // Separate join clause for count query
    let whereClause = "";
    let statusClause = "";

    // Build status clause if status is provided
    if (status) {
      statusClause =
        status === "registered"
          ? ` AND mu.user_id IS NOT NULL`
          : ` AND mu.user_id IS NULL`;
    }

    // Dynamically build query components based on role_id
    switch (parseInt(role_id, 10)) {
      case 4:
        baseTable = "mst_deo";
        baseTableAlias = "md";
        orderBy = "ORDER BY md.district_name";
        joinClause = `LEFT JOIN mst_users mu ON mu.table_name = 'mst_deo' AND mu.column_value = md.district_cd::text`;
        countJoinClause = status ? joinClause : "";

        // For DEO, ONLY use district_cd (ignore block_cd & cluster_cd)
        if (district_cd) {
          filterParams = [district_cd]; // Reset to only district_cd
          whereClause = `WHERE ${baseTableAlias}.district_cd = $1${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }

        query = `
        SELECT
            md.district_name AS district,
            md.deo_name as name,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
        FROM mst_deo md
        ${joinClause}
        ${whereClause}
        ${orderBy}
        LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
    `;
        break;

      case 5:
        baseTable = "mst_beo";
        baseTableAlias = "mb";
        orderBy = "ORDER BY mb.block_name";
        joinClause = `LEFT JOIN mst_users mu ON mu.table_name = 'mst_beo' AND mu.column_value = mb.block_cd::text`;
        countJoinClause = status ? joinClause : "";

        // For BEO, ONLY use district_cd & block_cd (ignore cluster_cd)
        if (district_cd && block_cd) {
          filterParams = [district_cd, block_cd]; // Reset to only district_cd & block_cd
          whereClause = `WHERE ${baseTableAlias}.district_cd = $1 AND ${baseTableAlias}.block_cd = $2${statusClause}`;
        } else if (district_cd) {
          filterParams = [district_cd]; // Only district_cd
          whereClause = `WHERE ${baseTableAlias}.district_cd = $1${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }

        query = `
        SELECT
            mb.district_name as district,
            mb.block_name AS block,
            mb.beo_name as name,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
        FROM mst_beo mb
        ${joinClause}
        ${whereClause}
        ${orderBy}
        LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
    `;
        break;
      case 6:
        baseTable = "mst_cac";
        baseTableAlias = "mc";
        orderBy = "ORDER BY mc.cluster_name";
        joinClause = `LEFT JOIN mst_users mu ON mu.table_name = 'mst_cac' AND mu.column_value = mc.cluster_cd::text`;
        countJoinClause = status ? joinClause : "";
        if (filterLevel === "cluster") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict} AND ${baseTableAlias}.block_cd = ${paramIndexBlock} AND ${baseTableAlias}.cluster_cd = ${paramIndexCluster}${statusClause}`;
        } else if (filterLevel === "block") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict} AND ${baseTableAlias}.block_cd = ${paramIndexBlock}${statusClause}`;
        } else if (filterLevel === "district") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict}${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }
        query = `
          SELECT
            mc.district_name as district,
            mc.block_name as block,
            mc.cluster_name AS cluster,
            mc.cac_name as name,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
          FROM mst_cac mc
          ${joinClause}
          ${whereClause}
          ${orderBy}
          LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
        `;
        break;

      case 7:
        baseTable = "mst_schools";
        baseTableAlias = "ms";
        orderBy = "ORDER BY ms.school_name";
        joinClause = `LEFT JOIN mst_users mu ON mu.table_name = 'mst_schools' AND mu.column_name = 'udise_sch_code' AND mu.column_value = ms.udise_sch_code::text`;
        countJoinClause = status ? joinClause : "";
        if (filterLevel === "cluster") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict} AND ${baseTableAlias}.block_cd = ${paramIndexBlock} AND ${baseTableAlias}.cluster_cd = ${paramIndexCluster}${statusClause}`;
        } else if (filterLevel === "block") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict} AND ${baseTableAlias}.block_cd = ${paramIndexBlock}${statusClause}`;
        } else if (filterLevel === "district") {
          whereClause = `WHERE ${baseTableAlias}.district_cd = ${paramIndexDistrict}${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }
        query = `
          SELECT
            ms.district_name as district,
            ms.block_name as block,
            ms.cluster_name as cluster,
            ms.school_name AS name,
            ms.udise_sch_code::text AS udise_code,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
          FROM mst_schools ms
          ${joinClause}
          ${whereClause}
          ${orderBy}
          LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
        `;
        break;

      case 8:
        baseTable = "mst_teacher";
        baseTableAlias = "mt";
        orderBy = "ORDER BY mt.name_eng";
        joinClause = `JOIN mst_schools ms ON mt.current_udise_id = ms.udise_sch_code
                      LEFT JOIN mst_users mu ON mu.table_name = 'mst_teacher' AND mu.column_value = mt.teacher_code`;
        countJoinClause = status
          ? joinClause
          : `JOIN mst_schools ms ON mt.current_udise_id = ms.udise_sch_code`;
        if (filterLevel === "cluster") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock} AND ms.cluster_cd = ${paramIndexCluster}${statusClause}`;
        } else if (filterLevel === "block") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock}${statusClause}`;
        } else if (filterLevel === "district") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict}${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }
        query = `
          SELECT
            mt.udise_id as udise,
            mt.name_eng AS name,
            mt.teacher_code,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
          FROM mst_teacher mt
          ${joinClause}
          ${whereClause}
          ${orderBy}
          LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
        `;
        break;

      case 9:
        baseTable = "mst_programmers";
        baseTableAlias = "mp";
        orderBy = "ORDER BY mp.programmer_name";
        joinClause = `LEFT JOIN mst_users mu ON mu.table_name = 'mst_programmers' AND mu.contact_number = mp.mobile::text`;
        countJoinClause = joinClause; 

        // For Programmers (role_id 9), ONLY use district_cd (ignore block_cd & cluster_cd)
        if (district_cd) {
          filterParams = [district_cd]; // Reset to only district_cd
          whereClause = `WHERE ${baseTableAlias}.district_cd = $1${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }

        query = `
    SELECT
        mp.district_name AS district_name,
        mp.district_cd::text AS code,
        mp.programmer_name AS name,
        CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
    FROM mst_programmers mp
    ${joinClause}
    ${whereClause}
    ${orderBy}
    LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
  `;
    
        break;
      case 10:
        baseTable = "mst_udise_teacher";
        baseTableAlias = "mt";
        orderBy = "ORDER BY mt.emp_name";
        joinClause = `JOIN mst_schools ms ON ms.udise_sch_code = mt.udise_sch_code AND ms.sch_mgmt_id IN (4,5,97,98)
                      LEFT JOIN mst_users mu ON mu.table_name = 'mst_udise_teacher' AND mu.column_value = mt.nat_tch_id`;
        countJoinClause = status
          ? joinClause
          : `JOIN mst_schools ms ON ms.udise_sch_code = mt.udise_sch_code AND ms.sch_mgmt_id IN (4,5,97,98)`;
        if (filterLevel === "cluster") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock} AND ms.cluster_cd = ${paramIndexCluster}${statusClause}`;
        } else if (filterLevel === "block") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict} AND ms.block_cd = ${paramIndexBlock}${statusClause}`;
        } else if (filterLevel === "district") {
          whereClause = `WHERE ms.district_cd = ${paramIndexDistrict}${statusClause}`;
        } else {
          whereClause = statusClause ? `WHERE ${statusClause.slice(5)}` : "";
        }
        query = `
          SELECT
            mt.emp_name AS name,
            mt.nat_tch_id,
            mt.udise_sch_code as udise,
            CASE WHEN mu.user_id IS NOT NULL THEN 'registered' ELSE 'unregistered' END AS status
          FROM mst_udise_teacher mt
          ${joinClause}
          ${whereClause}
          ${orderBy}
          LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
        `;
        break;

      default:
        return responseHandler(
          res,
          400,
          "Invalid role_id. Please provide a valid role_id."
        );
    }

    // Append limit and offset to filterParams for the main data query
    const dataQueryParams = [...filterParams, parsedLimit, offset];

    // Construct the count query (without LIMIT and OFFSET)
    countQuery = `
      SELECT COUNT(*)
      FROM ${baseTable} ${baseTableAlias}
      ${countJoinClause}
      ${whereClause};
    `;
    const countQueryParams = filterParams;

    // Execute both queries concurrently
    const [result, countResult] = await Promise.all([
      pool.query(query, dataQueryParams),
      pool.query(countQuery, countQueryParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / parsedLimit);

    responseHandler(res, 200, "User records fetched successfully.", {
      data: result.rows,
      pagination: {
        total,
        totalPages,
        page: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    console.error("Error in getVerfiedUserStatsList:", error);
    responseHandler(res, 500, "Error fetching user list.", null, error);
  }
};

/*
const getUnscannedBookSchList = async (req, res) => {
  try {
    const { district_cd, block_cd, cluster_cd, udise_code } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }
    if (udise_code) {
      filterConditions.push(`ms.udise_sch_code::text = $${paramIndex++}`);
      filterParams.push(udise_code);
    }

    const whereClause =
      filterConditions.length > 0
        ? `AND ${filterConditions.join(" AND ")}`
        : "";

    const dataQuery = `
      SELECT
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code::text AS udise_code
      FROM tbc_school_challans tsc
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = tsc.udise_code
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      WHERE tbt.udise_code IS NULL AND ms.sch_mgmt_id != 5
      ${whereClause}
      ORDER BY ms.school_name;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM tbc_school_challans tsc
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = tsc.udise_code
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      WHERE tbt.udise_code IS NULL
      ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, filterParams),
      pool.query(countQuery, filterParams),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      message: "Fetched schools that received books but not scanned.",
      total,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in getUnscannedBookSchList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/
const getUnscannedBookSchList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      udise_code,
      category,
      management,
      division_id
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (division_id) {
      filterConditions.push(`md.division_id = $${paramIndex++}`);
      filterParams.push(division_id);
    }
    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }
    if (udise_code) {
      filterConditions.push(`ms.udise_sch_code::text = $${paramIndex++}`);
      filterParams.push(udise_code);
    }

    
    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2,3,4,5,6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3,5,6,7,8,10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    const whereClause =
      filterConditions.length > 0 ? `AND ${filterConditions.join(" AND ")}` : "";

    const dataQuery = `
      SELECT
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code::text AS udise_code,
        SUM(tscb.quantity) AS total_books
      FROM tbc_school_challans tsc
      INNER JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = tsc.udise_code
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds)   --join with division
      WHERE tbt.udise_code IS NULL 
        ${whereClause}
      GROUP BY 
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code
      ORDER BY 
        ms.district_name,
        ms.block_name,
        ms.cluster_name,
        ms.school_name;
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT ms.udise_sch_code) AS total
      FROM tbc_school_challans tsc
      INNER JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = tsc.udise_code
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds)   --join with division
      WHERE tbt.udise_code IS NULL 
        ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, filterParams),
      pool.query(countQuery, filterParams),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      message: "Fetched schools that received books but not scanned.",
      total,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in getUnscannedBookSchList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUnscannedBookClusterList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      category,
      management,
      division_id
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (division_id) {
      filterConditions.push(`md.division_id = $${paramIndex++}`);
      filterParams.push(division_id);
    }
    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }

    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2, 3, 4, 5, 6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3, 5, 6, 7, 8, 10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    const whereClause = filterConditions.length > 0
      ? `AND ${filterConditions.join(' AND ')}`
      : '';

    const clusterQuery = `
      SELECT 
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        COUNT(DISTINCT ms.udise_sch_code) AS total_schools_in_cluster,
        COUNT(DISTINCT tsc.udise_code) AS schools_received_challan,
        SUM(tscb.quantity) AS total_books
      FROM mst_schools ms
      LEFT JOIN tbc_school_challans tsc ON tsc.udise_code = ms.udise_sch_code
      LEFT JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = ms.udise_sch_code
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds)  --join with division
      WHERE 1=1
        ${whereClause}
      GROUP BY
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd, 
        ms.cluster_name
      HAVING 
        COUNT(DISTINCT tsc.udise_code) > 0
        AND COUNT(DISTINCT tbt.udise_code) = 0
      ORDER BY  
        ms.district_name,
        ms.block_name,
        ms.cluster_name;
    `;

    const result = await pool.query(clusterQuery, filterParams);

    return res.status(200).json({
      success: true,
      message: 'Clusters where scanning has not started but books were received.',
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in getUnscannedBookClusterList:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

/*
const getUnscannedBookClusterList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      category,
      management
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }

    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2, 3, 4, 5, 6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3, 5, 6, 7, 8, 10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    const whereClause = filterConditions.length > 0
      ? `AND ${filterConditions.join(' AND ')}`
      : '';

    const clusterQuery = `
      WITH class_1_to_8 AS (
        SELECT 
          cluster_cd,
          udise_sch_code,
          moi,
          (
            COALESCE(class_1, 0) + COALESCE(class_2, 0) + COALESCE(class_3, 0) +
            COALESCE(class_4, 0) + COALESCE(class_5, 0) + COALESCE(class_6, 0) +
            COALESCE(class_7, 0) + COALESCE(class_8, 0)
          ) AS total_1_to_8
        FROM cluster_student_count
      ),
      class_9_to_10 AS (
        SELECT 
          school_udise_code,
          school_medium,
          (
            COALESCE(class_9, 0) + COALESCE(class_10, 0)
          ) AS total_9_to_10
        FROM student_counts
      ),
      student_cluster_summary AS (
        SELECT 
          c18.cluster_cd,
          SUM(COALESCE(c18.total_1_to_8, 0)) AS total_1_to_8,
          SUM(COALESCE(c910.total_9_to_10, 0)) AS total_9_to_10,
          SUM(COALESCE(c18.total_1_to_8, 0) + COALESCE(c910.total_9_to_10, 0)) AS total_students
        FROM class_1_to_8 c18
        LEFT JOIN class_9_to_10 c910 
          ON c18.udise_sch_code = c910.school_udise_code 
          AND c18.moi::text = c910.school_medium
        GROUP BY c18.cluster_cd
      )

      SELECT 
        ms.cluster_cd,
        ms.cluster_name,
        COUNT(DISTINCT ms.udise_sch_code) AS total_schools_in_cluster,
        COUNT(DISTINCT tsc.udise_code) AS schools_received_challan,
        SUM(tscb.quantity) AS total_books,
        COALESCE(scs.total_1_to_8, 0) AS total_1_to_8,
        COALESCE(scs.total_9_to_10, 0) AS total_9_to_10,
        COALESCE(scs.total_students, 0) AS total_students
      FROM mst_schools ms
      LEFT JOIN tbc_school_challans tsc ON tsc.udise_code = ms.udise_sch_code
      LEFT JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      LEFT JOIN tbc_book_tracking tbt ON tbt.udise_code = ms.udise_sch_code
      LEFT JOIN student_cluster_summary scs ON ms.cluster_cd = scs.cluster_cd
      WHERE 1=1
        ${whereClause}
      GROUP BY 
        ms.cluster_cd, ms.cluster_name, 
        scs.total_1_to_8, scs.total_9_to_10, scs.total_students
      HAVING 
        COUNT(DISTINCT tsc.udise_code) > 0
        AND COUNT(DISTINCT tbt.udise_code) = 0
      ORDER BY ms.cluster_name;
    `;

    const result = await pool.query(clusterQuery, filterParams);

    return res.status(200).json({
      success: true,
      message: 'Clusters with received books and no scanning started, including student counts.',
      total: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error in getUnscannedBookClusterList:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};
*/

/*
const getScannedBookSchList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      udise_code,
      category,
      management,
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }
    if (udise_code) {
      filterConditions.push(`ms.udise_sch_code::text = $${paramIndex++}`);
      filterParams.push(udise_code);
    }

    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2, 3, 4, 5, 6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3, 5, 6, 7, 8, 10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    const whereClause =
      filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

    const dataQuery = `
      SELECT
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code::text AS udise_code,
        SUM(tscb.quantity) AS total_books,
        scanned.total_scanned
      FROM tbc_school_challans tsc
      INNER JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      INNER JOIN (
        SELECT
          udise_code,
          COUNT(*) AS total_scanned
        FROM tbc_book_tracking
        WHERE udise_code IS NOT NULL
        GROUP BY udise_code
      ) scanned ON scanned.udise_code = tsc.udise_code
      ${whereClause}
      GROUP BY
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code,
        scanned.total_scanned
      ORDER BY
        ms.district_name,
        ms.block_name,
        ms.cluster_name,
        ms.school_name;
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT ms.udise_sch_code) AS total
      FROM tbc_school_challans tsc
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      INNER JOIN (
        SELECT
          udise_code,
          COUNT(*) AS total_scanned
        FROM tbc_book_tracking
        WHERE udise_code IS NOT NULL
        GROUP BY udise_code
      ) scanned ON scanned.udise_code = tsc.udise_code
      ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, filterParams),
      pool.query(countQuery, filterParams),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      message: "Fetched schools that received and scanned books.",
      total,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in getScannedBookSchList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
*/

const getScannedBookSchList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      udise_code,
      category,
      management,
      division_id // ✅ new filter
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (division_id) {
      filterConditions.push(`md.division_id = $${paramIndex++}`);
      filterParams.push(division_id);
    }

    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }

    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }

    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }

    if (udise_code) {
      filterConditions.push(`ms.udise_sch_code::text = $${paramIndex++}`);
      filterParams.push(udise_code);
    }

    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2, 3, 4, 5, 6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3, 5, 6, 7, 8, 10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    const whereClause =
      filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

    const dataQuery = `
      SELECT
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code::text AS udise_code,
        SUM(tscb.quantity) AS total_books,
        scanned.total_scanned
      FROM tbc_school_challans tsc
      INNER JOIN tbc_school_challan_books tscb ON tscb.challan_id = tsc.id
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds) -- ✅ join with division
      INNER JOIN (
        SELECT
          udise_code,
          COUNT(*) AS total_scanned
        FROM tbc_book_tracking
        WHERE udise_code IS NOT NULL
        GROUP BY udise_code
      ) scanned ON scanned.udise_code = tsc.udise_code
      ${whereClause}
      GROUP BY
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code,
        scanned.total_scanned
      ORDER BY
        ms.district_name,
        ms.block_name,
        ms.cluster_name,
        ms.school_name;
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT ms.udise_sch_code) AS total
      FROM tbc_school_challans tsc
      JOIN mst_schools ms ON ms.udise_sch_code = tsc.udise_code
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds) -- ✅ join with division
      INNER JOIN (
        SELECT
          udise_code,
          COUNT(*) AS total_scanned
        FROM tbc_book_tracking
        WHERE udise_code IS NOT NULL
        GROUP BY udise_code
      ) scanned ON scanned.udise_code = tsc.udise_code
      ${whereClause};
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, filterParams),
      pool.query(countQuery, filterParams),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.status(200).json({
      success: true,
      message: "Fetched schools that received and scanned books.",
      total,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in getScannedBookSchList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getNotReceivedBookSchList = async (req, res) => {
  try {
    const {
      district_cd,
      block_cd,
      cluster_cd,
      udise_code,
      category,
      management,
      division_id
    } = req.body;

    const filterConditions = [];
    const filterParams = [];
    let paramIndex = 1;

    if (division_id) {
      filterConditions.push(`md.division_id = $${paramIndex++}`);
      filterParams.push(division_id);
    }
    if (district_cd) {
      filterConditions.push(`ms.district_cd = $${paramIndex++}`);
      filterParams.push(district_cd);
    }
    if (block_cd) {
      filterConditions.push(`ms.block_cd = $${paramIndex++}`);
      filterParams.push(block_cd);
    }
    if (cluster_cd) {
      filterConditions.push(`ms.cluster_cd = $${paramIndex++}`);
      filterParams.push(cluster_cd);
    }
    if (udise_code) {
      filterConditions.push(`ms.udise_sch_code::text = $${paramIndex++}`);
      filterParams.push(udise_code);
    }

    if (category) {
      switch (category.toLowerCase()) {
        case 'primary':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([1, 2, 3, 6]);
          break;
        case 'middle':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([2, 3, 4, 5, 6]);
          break;
        case 'high':
          filterConditions.push(`ms.sch_category_id = ANY($${paramIndex++})`);
          filterParams.push([3, 5, 6, 7, 8, 10]);
          break;
      }
    }

    if (management) {
      if (management.toLowerCase() === 'private') {
        filterConditions.push(`ms.sch_mgmt_id = 5`);
      } else if (management.toLowerCase() === 'gov') {
        filterConditions.push(`ms.sch_mgmt_id = ANY($${paramIndex++})`);
        filterParams.push([1, 2, 3, 4, 6, 7, 8, 9]);
      }
    }

    filterConditions.push(`
      NOT EXISTS (
        SELECT 1 
        FROM tbc_school_challans as tsc
        WHERE tsc.udise_code = ms.udise_sch_code
      )
    `);

    const whereClause =
      filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

    const dataQuery = `
      SELECT 
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code::text AS udise_code
      FROM mst_schools ms 
      LEFT OUTER JOIN tbc_depot_cluster_challans tdcc ON tdcc.cluster_id = ms.cluster_cd
      JOIN mst_division md ON ms.district_cd::text = ANY(md.district_cds)
      ${whereClause}
      GROUP BY 
        ms.district_cd,
        ms.district_name,
        ms.block_cd,
        ms.block_name,
        ms.cluster_cd,
        ms.cluster_name,
        ms.school_name,
        ms.udise_sch_code
      ORDER BY 
        ms.district_name,
        ms.block_name,
        ms.cluster_name,
        ms.school_name;
    `;

    const [dataResult] = await Promise.all([
      pool.query(dataQuery, filterParams)
    ]);

    return res.status(200).json({
      success: true,
      message: "Fetched schools that not received books",
      total: dataResult.rowCount,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in getNotReceivedBookSchList:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getVerfiedUsersCount,
  getVerfiedUserStats,
  getVerfiedUserStatsList,
  getUnscannedBookSchList,
  getUnscannedBookClusterList,
  getScannedBookSchList,
  getNotReceivedBookSchList
};
