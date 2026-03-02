  const { pool } = require('../../config/db');
  const responseHandler = require('../../utils/responseHandler');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res) => {
  /* #swagger.tags = ['Programmer Profile'] */
  /* #swagger.security = [{"Bearer": []}] */
  const user_id = req.user.user_id;
  const users = await pool.query('SELECT user_id, name, email, role_id, status FROM mst_users where role_id = $1 and user_id=$2' , ['9',user_id]);
  responseHandler(res, 200, 'Users fetched', users.rows);
};

// Update User
const updateProfile = async (req, res) => {
    /* #swagger.tags = ['Programmer Profile'] */
    /* #swagger.security = [{"Bearer": []}] */
        /*
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['profile_image'] = {
            name: "profile_image",
            in: "formData",
            description: "Profile image to upload",
            required: false,
            type: "file"
    } 
    #swagger.parameters['digital_signature'] = {
            name: "digital_signature",
            in: "formData",
            description: "Digital signature to upload",
            required: false,
            type: "file"
    } */
    try {
      const { id } = req.user.user_id;
      const { name, email, contact_number, address, status } = req.body;
  
      const profile_image = req.files['profile_image']?.[0]?.filename || null;
      const digital_signature = req.files['digital_signature']?.[0]?.filename || null;
  
      // Get existing user to preserve old values if new ones aren't provided
      const existingUser = await pool.query("SELECT * FROM public.mst_users WHERE user_id = $1 and role_id='9'", [id]);
      if (existingUser.rows.length === 0) {
        return responseHandler(res, 404, 'User not found');
      }
  
      const user = existingUser.rows[0];
  
      const updatedUser = await pool.query(
        `UPDATE public.mst_users 
         SET name=$1, email=$2, contact_number=$3, address=$4, 
             profile_image=$5, digital_signature=$6, status=$7
         WHERE user_id = $8 RETURNING *`,
        [
          name || user.name,
          email || user.email,
          contact_number || user.contact_number,
          address || user.address,
          profile_image || user.profile_image,
          digital_signature || user.digital_signature,
          status || user.status,
          id
        ]
      );
  
      responseHandler(res, 200, 'Profile updated successfully', updatedUser.rows[0]);
    } catch (error) {
      responseHandler(res, 400, 'Error updating Profile', null, error);
    }
  };

  // Update User
const updatePassword = async (req, res) => {
    /* #swagger.tags = ['Programmer Profile'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const { id } = req.user.user_id;
      const {password, contact_number } = req.body;
  
  
      // Get existing user to preserve old values if new ones aren't provided
      const existingUser = await pool.query("SELECT * FROM public.mst_users WHERE user_id = $1 and role_id='9'", [id]);
      if (existingUser.rows.length === 0) {
        return responseHandler(res, 404, 'User not found');
      }
  
      const user = existingUser.rows[0];
      const updatedPassword = password ? await bcrypt.hash(password, 12) : user.password;
  
      const updatedUser = await pool.query(
        `UPDATE public.mst_users 
         SET  password=$1, contact_number=$2 
         WHERE user_id = $3 RETURNING *`,
        [
          updatedPassword,
          contact_number || user.contact_number,
          id
        ]
      );
  
      responseHandler(res, 200, 'Password updated successfully', updatedUser.rows[0]);
    } catch (error) {
      responseHandler(res, 400, 'Error updating Password', null, error);
    }
  };

  module.exports = {
    updateProfile,
    updatePassword,
    getProfile
  };