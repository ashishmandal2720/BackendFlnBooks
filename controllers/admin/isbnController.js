const bwipjs = require("bwip-js");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const { pool } = require("../../config/db");

const calculateISBNChecksum = (isbnWithoutChecksum) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (i % 2 === 0 ? 1 : 3) * parseInt(isbnWithoutChecksum[i]);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
};
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};


const generateISBNFN = async (assignment_id, publisher_id, subject_id) => {
  const prefix = "978";
  const registration_group = "93"; // typically for India
  const fixedLength = prefix.length + registration_group.length; // 5

  const publisherStr = String(publisher_id);
  const subjectStr = String(subject_id);

  const remainingLength = 12 - fixedLength;
  let publisher_code = "";
  let title_identifier = "";

  // Dynamic allocation: give publisher_id 3-4 digits if possible, rest to subject
  if (publisherStr.length >= remainingLength) {
    publisher_code = publisherStr.slice(0, remainingLength);
    title_identifier = "0".repeat(0); // cannot assign any
  } else {
    publisher_code = publisherStr;
    title_identifier = subjectStr.padStart(remainingLength - publisherStr.length, "0");
  }

  const isbnWithoutChecksum = prefix + registration_group + publisher_code + title_identifier;
  const checksum = calculateISBNChecksum(isbnWithoutChecksum);

  return { isbn: isbnWithoutChecksum + checksum };
};

const addBook = async (res, isbn_code, publisher_id, subject_id, class_level) => {
  try {

    const bookExists = await pool.query("SELECT * FROM tbc_books WHERE isbn_code = $1", [isbn_code]);
    if (bookExists.rows.length > 0) {
      return res.status(400).json({ success:false,message: "Book already exists for this ISBN" });
    }

    await pool.query(
      "INSERT INTO tbc_books (isbn_code, publisher_id, subject_id, class_level) VALUES ($1, $2, $3, $4) RETURNING *",
      [isbn_code, publisher_id, subject_id, class_level]
    );

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const generateISBN = async (req, res) => {
  /* #swagger.tags = ['ISBN'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { assignment_id } = req.params;
    const assignmentNumber = parseInt(assignment_id); // Ensure assignment_id is an integer
    const assignment = await pool.query(
      "SELECT * FROM tbc_subject_assignments WHERE id = $1",
      [assignmentNumber]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const { publisher_id, subject_id, class_level } = assignment.rows[0];
    const isbnExists = await pool.query(
      "SELECT * FROM tbc_isbn_codes WHERE assignment_id = $1",
      [assignmentNumber]
    );

    if (isbnExists.rows.length > 0) {
      return res.json({success:false, message: "ISBN already generated", isbn: isbnExists.rows[0] });
    }

    const isbn_code = await generateISBNFN(assignmentNumber, publisher_id, subject_id);

    const newISBN = await pool.query(
      "INSERT INTO tbc_isbn_codes (assignment_id, isbn_code) VALUES ($1, $2) RETURNING *",
      [assignmentNumber, isbn_code?.isbn]
    );
    generateBarcode(res, assignmentNumber, newISBN.rows[0]);
    addBook(res, newISBN.rows[0]?.isbn_code, publisher_id, subject_id, class_level);

    res.status(200).json({ success:true,message: "ISBN generated successfully", isbn: newISBN.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getISBNByAssignment = async (req, res) => {
  /* #swagger.tags = ['ISBN'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { assignment_id } = req.params;
    const assignmentNumber = parseInt(assignment_id); // Ensure assignment_id is an integer
    const result = await pool.query(
      "SELECT * FROM tbc_isbn_codes WHERE assignment_id = $1",
      [assignmentNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ISBN not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const generateBarcode = async (res, assignment_id, data) => {
  /* #swagger.tags = ['ISBN'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {

    // Fetch ISBN from DB
    const isbnData = await pool.query("SELECT * FROM tbc_isbn_codes WHERE assignment_id = $1", [assignment_id]);
    if (isbnData.rows.length === 0) {
      return res.status(404).json({ success:false,message: "ISBN not found" });
    }

    const isbnCode = isbnData.rows[0].isbn_code;

    // Generate barcode
    bwipjs.toBuffer(
      {
        bcid: "ean13",
        text: isbnCode,
        scale: 3,
        height: 25,
        includetext: true,
        textxalign: "center",
      },
      async (err, png) => {
        if (err) {
          console.log(err);
          return res.status(400).json({ success:false,error: "Barcode generation failed", err: err });
        }
        ensureDirectoryExists("barcodes");
        ensureDirectoryExists("barcodes/pdfs");
        const barcodePath = `barcodes/${isbnCode}.png`;
        fs.writeFileSync(barcodePath, png);

        console.log(barcodePath);
        await pool.query("UPDATE tbc_isbn_codes SET barcode_path = $1 WHERE assignment_id = $2", [barcodePath, assignment_id]);
        await pool.query("UPDATE tbc_subject_assignments SET book_isbn_path = $1 WHERE id = $2", [barcodePath, assignment_id]);

      }
    );
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const downloadISBNPdf = async (req, res) => {
  /* #swagger.tags = ['ISBN'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { assignment_id } = req.params;
    const assignmentNumber = parseInt(assignment_id); // Ensure assignment_id is an integer
    const isbnData = await pool.query("SELECT * FROM tbc_isbn_codes WHERE assignment_id = $1", [assignmentNumber]);
    if (isbnData.rows.length === 0) {
      return res.status(404).json({ message: "ISBN not found" });
    }

    const { isbn_code, barcode_path } = isbnData.rows[0];

    if (!fs.existsSync(barcode_path)) {
      return res.status(404).json({ message: "Barcode image not found" });
    }
    ensureDirectoryExists("barcodes");
    ensureDirectoryExists("barcodes/pdfs");
    const doc = new PDFDocument();
    const pdfPath = `barcodes/pdfs/${isbn_code}.pdf`;
    const pdfStream = fs.createWriteStream(pdfPath);

    doc.pipe(pdfStream);
    doc.fontSize(20).text(`ISBN: ${isbn_code}`, { align: "center" });
    doc.image(barcode_path, { align: "center", width: 200 });
    doc.end();

    pdfStream.on("finish", () => {
      res.download(pdfPath, `${isbn_code}.pdf`);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const getISBNDetails = async (req, res) => {
  /* #swagger.tags = ['ISBN'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { isbn_code } = req.params;

    const result = await pool.query(
      `SELECT book.id, book.isbn_code,u.name as publisher_name, sub.name as subject_name, sub.class_level, sub.medium
       FROM tbc_books book
        INNER join mst_users u ON book.publisher_id = u.user_id
        INNER join mst_subjects sub ON book.subject_id = sub.id
        WHERE book.isbn_code = $1`,
      [isbn_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ISBN not found" });
    }

    res.status(200).json({success: true,message: "ISBN details fetched successfully", data: result.rows[0]});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { generateISBN, getISBNByAssignment, generateBarcode, downloadISBNPdf ,getISBNDetails };