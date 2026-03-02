// const { pool } = require("../config/db");
// const createFunctionAndTrigger = async () => {
//     try {
//         // Step 1: Create the function
//         await pool.query(`
//             CREATE OR REPLACE FUNCTION generate_10_digit_code() RETURNS TRIGGER AS $$
//             DECLARE
//                 hashed_value BIGINT;
//             BEGIN
//                 IF (SELECT COUNT(*) FROM mst_users WHERE user_id = NEW.user_id) = 0 THEN
//                     RAISE EXCEPTION 'User ID does not exist';
//                 END IF;

//                 IF (SELECT COUNT(*) FROM tbc_books WHERE id = NEW.book_id) = 0 THEN
//                     RAISE EXCEPTION 'Book ID does not exist';
//                 END IF;
//                 -- Generate a hash using user_id, book_id, and a secret key
//                 SELECT mod(
//                     abs(('x' || substr(encode(digest(NEW.user_id || NEW.book_id || 'vsk_tbc_key', 'sha256'), 'hex'), 1, 15))::bit(64)::bigint),
//                     10000000000
//                 )
//                 INTO hashed_value;

//                 -- Ensure it's exactly 10 digits by padding with leading zeros if needed
//                 NEW.unique_identifier := LPAD(hashed_value::TEXT, 10, '0');
                
//                 RETURN NEW;
//             END;
//             $$ LANGUAGE plpgsql;
//         `);

//         // Step 2: Create the trigger
//         await pool.query(`
//             CREATE TRIGGER trigger_generate_code
//             BEFORE INSERT ON tbc_isbn_codes
//             FOR EACH ROW
//             EXECUTE FUNCTION generate_10_digit_code();
//         `);

//         console.log("✅ Function and Trigger Created Successfully");
//     } catch (error) {
//         console.error("❌ Error Creating Function & Trigger:", error);
//     }
// };
// module.exports = { createFunctionAndTrigger };
