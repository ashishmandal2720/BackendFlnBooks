const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const responseHandler = require('../utils/responseHandler');

const authenticate = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return responseHandler(res, 401, "Unauthorized: Token missing or invalid format");
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    responseHandler(res, 401, "Unauthorized: Invalid Token", null, error);
  }
};

const checkRole = (allowedRoles) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.user_id) {
      return responseHandler(res, 401, "Unauthorized: Invalid User Data");
    }

    // Fetch user role hierarchy level
    const userQuery = await pool.query(
      "SELECT r.hierarchy_level FROM mst_roles r JOIN mst_users u ON u.role_id = r.role_id WHERE u.user_id = $1",
      [req.user.user_id]
    );

    if (!userQuery.rows.length) {
      return responseHandler(res, 401, "Unauthorized: Role not found");
    }

    const userLevel = userQuery.rows[0].hierarchy_level;

    // Get allowed roles hierarchy levels
    const allowedLevelsQuery = await pool.query(
      "SELECT hierarchy_level FROM mst_roles WHERE role_name = any($1)",
      [allowedRoles]
    );

    if (!allowedLevelsQuery.rows.length) {
      return responseHandler(res, 401, "Unauthorized: No valid roles found");
    }

    const maxAllowedLevel = Math.max(...allowedLevelsQuery.rows.map((r) => r.hierarchy_level));

    if (userLevel > maxAllowedLevel) {
      return responseHandler(res, 403, "Forbidden: Insufficient Permissions");
    }

    next();
  } catch (error) {
    console.error("Check Role Error:", error);
    responseHandler(res, 500, "Internal Server Error", null, error);
  }
};


module.exports = { authenticate, checkRole };