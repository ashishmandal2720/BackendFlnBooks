const { pool } = require("../../config/db");
const fs = require("fs");
const path = require("path");

// Function to delete a file if it exists
const deleteFileIfExists = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

function checkFileType(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const pdfExtension = '.pdf';
  
    const lowerFileName = fileName.toLowerCase();
  
    if (imageExtensions.some(ext => lowerFileName.includes(ext))) {
      return 'image';
    } else if (lowerFileName.includes(pdfExtension)) {
      return 'pdf';
    } else {
      return 'unknown';
    }
  }
// Upload Front or Back Cover
const uploadCover = async (req, res) => {
    /* #swagger.tags = ['Books'] */
    /* #swagger.security = [{"Bearer": []}] */
    /* #swagger.parameters['book_id'] = { description: 'Book ID', type: 'integer' } */
    /* 
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['file'] = {
            name: "file",
            in: "formData",
            description: "file to upload",
            required: false,
            type: "file"
          }
    */
    try {
        const { book_id, type } = req.params;

        const bookNumber = parseInt(book_id); // Ensure book_id is an integer
        if (!req.file) {
            return res.status(400).json({success:false, message: "No file uploaded" });
        }

        const column = type === "front" ? "front_cover_url" : "back_cover_url";

        // Fetch existing file path
        const book = await pool.query(`SELECT ${column} FROM tbc_books WHERE id = $1`, [bookNumber]);
        if (book.rows.length > 0 && book.rows[0][column]) {
            const oldFilePath = path.join(__dirname, "..", book.rows[0][column]); // Resolve old file path
            deleteFileIfExists(oldFilePath); // Delete old file
        }

        let fileUrl = ``;
        if(checkFileType(req.file.filename) === 'image'){
            fileUrl = `/uploads/images/${req.file.filename}`;
        }
        if(checkFileType(req.file.filename) === 'pdf'){
            fileUrl = `/uploads/pdfs/${req.file.filename}`;
        }
        if(checkFileType(req.file.filename) === 'unknown'){
            return res.status(400).json({ success:false, error: "File type Error only Image or PDF allowed" });
        }
        

        const updatedBook = await pool.query(
            `UPDATE tbc_books SET ${column} = $1 WHERE id = $2 RETURNING *`,
            [fileUrl, bookNumber]
        );

        res.json({ success:true,message: `${type} cover uploaded`, book: updatedBook.rows[0] });
    } catch (error) {
        res.status(400).json({ success:false, error: error.message });
    }
};

// Upload Content PDF
const uploadContent = async (req, res) => {
    /* #swagger.tags = ['Books'] 
    #swagger.security = [{"Bearer": []}] 
    #swagger.parameters['book_id'] = { description: 'Book ID', type: 'integer' } 
     
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['file'] = {
            name: "file",
            in: "formData",
            description: "file to upload",
            required: false,
            type: "file"
          }
    */
    try {
        const { book_id } = req.params;
        const bookNumber = parseInt(book_id); // Ensure book_id is an integer
        if (!req.file) {
            return res.status(400).json({success:false, message: "No file uploaded" });
        }

        // Fetch existing file path
        const book = await pool.query("SELECT content_rcv_yn FROM tbc_books WHERE id = $1", [bookNumber]);
        if (book.rows.length > 0 && book.rows[0].content_rcv_yn) {
            const oldFilePath = path.join(__dirname, "..", book.rows[0].content_rcv_yn); // Resolve old file path
            deleteFileIfExists(oldFilePath); // Delete old file
        }

        const fileUrl = `/uploads/pdfs/${req.file.filename}`;

        const updatedBook = await pool.query(
            "UPDATE tbc_books SET content_rcv_yn = $1 WHERE id = $2 RETURNING *",
            [fileUrl, bookNumber]
        );

        res.json({ success:true,message: "Content PDF uploaded", book: updatedBook.rows[0] });
    } catch (error) {
        res.status(400).json({ success:false, error: error.message });
    }
};

module.exports = { uploadCover, uploadContent };