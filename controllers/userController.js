const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const responseHandler = require('../utils/responseHandler');

const getUsers = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  const users = await pool.query('SELECT user_id, name, email, role_id, status FROM mst_users where role_id not in (4,5,6,7,8,9,10) ORDER BY created_at DESC');
  responseHandler(res, 200, 'Users fetched', users.rows);
};


// Add User
const addUser = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { name, email, password, role, contact_number, address, profile_image, digital_signature } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await pool.query(
      "INSERT INTO public.mst_users(name, email, password, role_id, contact_number, address, profile_image, digital_signature, status) VALUES ($1, $2, $3, $4, $5, $6, $7,$8,$9) RETURNING *",
      [name, email, hashedPassword, role, contact_number, address, profile_image, digital_signature, 'Approved',]
    );

    // res.status(201).json({ message: "User added successfully", User: newUser.rows[0] });
    responseHandler(res, 200, 'User added successfully', newUser.rows[0]);
  } catch (error) {
    // res.status(500).json({ error: error.message });
    responseHandler(res, 400, 'Error adding User', null, error);
  }
};

// Update User
const updateUser = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const { name, email, password, contact_number, address, profile_image, digital_signature, status,role_id } = req.body;

    const updatedUser = await pool.query(
      "UPDATE public.mst_users SET name=$1, email=$2, password=$3, contact_number=$4, address=$5, profile_image=$6, digital_signature=$7, status=$8,role_id=$9 WHERE user_id = $10 RETURNING *",
      [name, email, password, contact_number, address, profile_image, digital_signature, status,role_id, id]
    );

    if (updatedUser.rows.length === 0) {
      return responseHandler(res, 404, 'User not found');
    }
    responseHandler(res, 200, 'User updated successfully', updatedUser.rows[0]);
  } catch (error) {
    responseHandler(res, 400, 'Error updating User', null, error);
  }
};

// Delete User
const deleteUser = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;

    const deletedUser = await pool.query("DELETE FROM public.mst_users WHERE user_id = $1 RETURNING *", [id]);

    if (deletedUser.rows.length === 0) {
      return responseHandler(res, 404, 'User not found');
    }
    responseHandler(res, 200, 'User deleted successfully', deletedUser.rows[0]);
  } catch (error) {
    responseHandler(res, 400, 'Error deleting User', null, error);
  }
};

const approveUser = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return responseHandler(res, 400, 'Invalid status');
    }
    await pool.query('UPDATE mst_users SET status = $1, approved_by = $2 WHERE user_id = $3', [
      status,
      req.user.user_id,
      id,
    ]);
    await pool.query(
      "INSERT INTO tbc_notifications (user_id, message) VALUES ($1, $2)",
      [id, `Your Account Has ${status} By Administrator.`]
    );
    responseHandler(res, 200, `User ${status}`);
  } catch (e) {
    responseHandler(res, 400, 'Error approving user', null, e);
  };
}

const updatePassword = async (req, res) => {
  /* #swagger.tags = ['Users'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const id = req.user.user_id;
    const { newPassword,oldPassword } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM mst_users WHERE user_id = $1',
      [id]
    );

    if (!userResult.rows.length) return responseHandler(res, 400, 'Please Login Again');

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return responseHandler(res, 401, 'Password Not Matched');
    else{
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE mst_users SET password = $1 WHERE user_id = $2', [
        hashedPassword,
        id,
      ]);
      responseHandler(res, 200, `Password updated successfully`);
    }
  } catch (e) {
    responseHandler(res, 400, 'Password Updation Failed', null, e);
  };
}


const resetPassword = async (req, res) => {
  /* #swagger.tags = ['Users'] */
   /* #swagger.security = [{"Bearer": []}] */

  try {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
      // return responseHandler(res, 400, 'Email or Contact Number and new password are required');
      return res.status(400).json({ success: false, message: 'Email/Employee ID or Contact Number and new password are required' });
    }

    // Find user by email or contact_number
    const userResult = await pool.query(
      'SELECT user_id FROM mst_users WHERE email = $1 OR contact_number = $1',
      [identifier]
    );

    if (!userResult.rows.length) {
      // return responseHandler(res, 404, 'User not found with provided Email/EmployeeID or Contact Number');
      return res.status(404).json({ success: false, message: 'User not found with provided Email/EmployeeID or Contact Number' });
    }

    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      'UPDATE mst_users SET password = $1 WHERE user_id = $2',
      [hashedPassword, user.user_id]
    );

  //   responseHandler(res, 200, 'Password reset successfully');
  // } catch (error) {
  //   responseHandler(res, 400, 'Error resetting password', null, error);
  // }

     res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};

module.exports = { getUsers, approveUser, addUser,deleteUser,updateUser,updatePassword,resetPassword};
