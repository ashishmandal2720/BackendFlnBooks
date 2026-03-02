const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const responseHandler = require('../utils/responseHandler');

// const registerUser = async (req, res) => {
//   /* #swagger.tags = ['Auth'] */
//   try {
//     const { name, email, password, role_id,contact,address } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 12);
//     await pool.query(
//       'INSERT INTO public.mst_users( name, email, password, role_id, contact_number, address, profile_image, digital_signature, udise_sch_id, teacher_id, cluster_id, block_id, deo_id, status, approved_by ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15);',
//       [name, email, hashedPassword, role_id, contact,address,'','',null,null,null,null,null,'Pending',null]
//     );

//     responseHandler(res, 201, 'User registered Successfully');
//   } catch (error) {
//     responseHandler(res, 400, 'Error registering user', null, error);
//   }
// };

const roleMappings = {
  1: { table_name: null, column_name: null },
  2: { table_name: null, column_name: null },
  3: { table_name: 'mst_depot', column_name: 'depot_cd' },
  4: { table_name: 'mst_deo', column_name: 'mobile' },
  5: { table_name: 'mst_beo', column_name: 'mobile' },
  6: { table_name: 'mst_cac', column_name: 'cluster_cd' },
  7: { table_name: 'mst_schools', column_name: 'udise_sch_code' },
  8: { table_name: 'mst_teacher', column_name: 'teacher_code' },
  10: { table_name: 'mst_udise_teacher', column_name: 'nat_tch_id' },
  // 8: { table_name: 'mst_schools', column_name: 'udise_sch_code' },
};

// const registerUser = async (req, res) => {
//   /* #swagger.tags = ['Auth'] */

//   try {
//     const { name, email, password, role_id, contact, address } = req.body;

//     if (!roleMappings[role_id]) {
//       return responseHandler(res, 400, 'Invalid role_id');
//     }

//     const { table_name, column_name } = roleMappings[role_id];

//     const column_value = req.body[column_name] || null;
//     const existingUser = await pool.query('SELECT user_id FROM mst_users WHERE email = $1', [email]);
//     if (existingUser.rows.length > 0) {
//       return responseHandler(res, 400, 'Email already registered');
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);

//     await pool.query(
//       `INSERT INTO mst_users 
//        (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
//        VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Pending', NULL)`,
//       [name, email, hashedPassword, role_id, contact, address, table_name, column_name, column_value]
//     );

//     responseHandler(res, 201, 'User registered successfully');
//   } catch (error) {
//     console.error('Error registering user:', error);
//     responseHandler(res, 500, 'Error registering user', null, error);
//   }
// };

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
      return responseHandler(res, 400, 'Already registered');
    }
    if (role_number === 1 || role_number === 2) {
      const hashedPassword = await bcrypt.hash(password, 12);

      await pool.query(
        `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Pending', NULL)`,
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
        if (role_number === 8) {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Pending', NULL)`,
            [checkDB.rows[0]?.name_eng, checkDB.rows[0]?.teacher_code, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        } else if (role_number === 10) {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Pending', NULL)`,
            [checkDB.rows[0]?.emp_name, checkDB.rows[0]?.nat_tch_id, hashedPassword, role_number, contact, address, table_name, column_name, unique_code]
          );
          return responseHandler(res, 201, `${roles.rows[0].role_name} registered successfully`);
        }else {
          await pool.query(
            `INSERT INTO mst_users 
          (name, email, password, role_id, contact_number, address, profile_image, digital_signature, table_name, column_name, column_value, status, approved_by) 
          VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, 'Pending', NULL)`,
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
        detailsQuery = `SELECT ms.*,tch.name_eng as emp_name,tch.designation_name_eng as designation_name, tch.designation_id as tch_type,tch.teacher_code as nat_tch_id FROM ${user.table_name} as tch LEFT JOIN mst_schools as ms ON ms.udise_sch_code::bigint = tch.current_udise_id::bigint WHERE ${user.column_name} = $1 `;
      }
      else if (user.role_id === 10) {
        detailsQuery = `SELECT ms.*,tch.* FROM ${user.table_name} as tch LEFT JOIN mst_schools as ms ON ms.udise_sch_code::bigint = tch.udise_sch_code::bigint WHERE ${user.column_name} = $1 `;
        // detailsQuery = `SELECT * FROM ${user.table_name} as tch LEFT JOIN mst_schools as ms ON ms.udise_sch_code = tch.current_udise_id WHERE ${user.column_name} = $1 `;
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
      expiresIn: '12h',
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
     role = await pool.query('SELECT * FROM mst_roles where role_id in (4,5,6,7,8,10)');
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


module.exports = { registerUser, loginUser, getRole,getRoleId };
