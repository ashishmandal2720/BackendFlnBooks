
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

// const generateBarcodeImage = async (isbn, color) => {
//     return new Promise((resolve, reject) => {
//         bwipjs.toBuffer(
//             {
//                 bcid: "ean13", // Use EAN-13 for ISBN-13
//                 text: isbn,
//                 scale: 2, // Scale factor
//                 height: 10, // Bar height in mm
//                 includetext: true, // Include the ISBN number below the barcode
//                 textxalign: "center", // Center align text
//                 backgroundcolor: "ffffff", // White background
//                 barcolor: color,// Dynamic color for barcode
//             },
//             (err, png) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 resolve(png);
//             }
//         );
//     });
// };
// const generateISBN13 = () => {
//     const prefix = "978"; // Fixed prefix for ISBN-13
//     const body = Math.floor(Math.random() * 1000000000)
//       .toString()
//       .padStart(9, "0"); // Generate 9 random digits
//     const base = prefix + body;
  
//     // Calculate checksum
//     let sum = 0;
//     for (let i = 0; i < 12; i++) {
//       sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
//     }
//     const checksum = (10 - (sum % 10)) % 10;
  
//     return base + checksum; // Return the full ISBN-13
//   };
const getPubOrders = async (req, res) => {
    /* #swagger.tags = ['Publishers Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const pub_id = req.user.user_id;
        
        const result = await pool.query(
            `SELECT ba.id, b.isbn_code,ms.name,b.id as book_id, b.class_level, b.front_cover_url, b.back_cover_url, b.content_rcv_yn,b.content_pub_rcv, ba.quantity,ba.remaining_qty as remaining, ba.assigned_date ,ba.verify
         FROM tbc_book_assignments ba
         JOIN tbc_books b ON ba.book_id = b.id
         JOIN mst_subjects ms on ms.id=b.subject_id
         WHERE ba.publisher_id = $1
         ORDER BY ba.assigned_date DESC`,
            [pub_id]
        );
        if (result.rows.length === 0) {
            return responseHandler(res, 400, 'No orders found', []);
        }

        responseHandler(res, 200, 'Orders fetched', { result: result.rows });
    } catch (error) {
        responseHandler(res, 400, 'Error fetching Orders', null, error);
    }
};

// Get Single Publisher
const getPubOrdersById = async (req, res) => {
    /* #swagger.tags = ['Publishers Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { order_id } = req.params;
        const orderId = parseInt(order_id); // Ensure order_id is an integer
        const user_id = req.user.user_id;

        const result = await pool.query(
            `SELECT ba.id, b.isbn_code,s.name,b.id as book_id, ba.unique_identifier, b.class_level, b.front_cover_url, b.back_cover_url, b.content_rcv_yn, ba.quantity,ba.remaining_qty as remaining, ba.assigned_date
         FROM tbc_book_assignments ba
         JOIN tbc_books b ON ba.book_id = b.id
         JOIN mst_subjects s on s.id=b.subject_id
         WHERE ba.publisher_id = $1 and ba.id = $2
         ORDER BY ba.assigned_date DESC`,
            [user_id, orderId]
        );

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No orders found', []);
        }

      
        responseHandler(res, 200, 'Orders fetched', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching Order', null, error);
    }
};

const publisherVerifyContent = async (req, res) => {
    /* #swagger.tags = ['Publishers Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
  const {book_id,status } = req.body;
  const id_number = parseInt(book_id);
  const verify = parseInt(status);
  if (verify !== 1 && verify !== 0) {
    return res.status(400).json({ success: false, message: "'Status' must be a 1-Recieved or 0-Not Recieved." });
  }

  try {
    const result = await pool.query(
      `UPDATE tbc_books SET content_pub_rcv = $1 WHERE id = $2 RETURNING *`,
      [verify, id_number]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Status Updation Failed." });
    }

    res.status(200).json({
      success: true,
      message: 'Receiving status updated successfully.',
      data: [],
    });
  } catch (error) {
    console.error('Error updating status:', error.message);
    res.status(500).json({ success: false, message: 'Error updating status',error: error });
  }
};

// const BASE_URL = `${HOST}:${PORT}`;

// const PARENT_DIR = path.join(__dirname, '../..'); // Moves one level up
// const BARCODE_DIR = path.join(PARENT_DIR, 'barcodes', 'pub');
// // const BARCODE_DIR = path.join(__dirname, 'barcodes', 'pub');

// const ensureDirectoryExists = (dir) => {
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
// };


// const generateBarcodesAndPDF = async (req,totalBarcodes = 100) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             ensureDirectoryExists(BARCODE_DIR);
//             const pdfFileName = `isbn-barcode-${Date.now()}.pdf`;
//             const pdfFilePath = path.join(BARCODE_DIR, pdfFileName);
//             const barcodesPerPage = 56; // Adjusted to match layout (9 rows * 5 cols)
//             const numPages = Math.ceil(totalBarcodes / barcodesPerPage);
//             const chunkSize = 1000; // Keep this for memory efficiency
//             const doc = new PDFDocument({ size: "A4", margin: 5 });
//             const writeStream = fs.createWriteStream(pdfFilePath);
//             doc.pipe(writeStream);

//             // Layout configuration
//             const numRows = 14;
//             const numCols = 4;
//             const pageWidth = doc.page.width - doc.options.margin * 1;
//             const pageHeight = doc.page.height;
//             const colWidth = pageWidth / numCols;
//             const rowHeight = pageHeight / numRows;
//             const barcodeWidth = 110;
//             const barcodeHeight = 40;

//             let currentPage = 1;
//             let barcodeCount = 0;

//             const colors = ["000000"]; // Black only for simplicity; add more if needed

//             // Process barcodes in chunks
//             for (let i = 0; i < totalBarcodes; i += chunkSize) {
//                 const chunkSizeAdjusted = Math.min(chunkSize, totalBarcodes - i);
//                 const isbnList = Array.from({ length: chunkSizeAdjusted }, () => generateISBN13());

//                 for (const isbn of isbnList) {
//                     const row = Math.floor(barcodeCount / numCols) % numRows;
//                     const col = barcodeCount % numCols;

//                     // Generate barcode image for each ISBN
//                     const barcodeImage = await generateBarcodeImage(isbn, colors[0]);

//                     const x = col * colWidth + (colWidth - barcodeWidth) / 2;
//                     const y = row * rowHeight + (rowHeight - barcodeHeight) / 2;

//                     doc.image(barcodeImage, x, y, { width: barcodeWidth, height: barcodeHeight });

//                     barcodeCount++;

//                     // Add new page if current page is full
//                     if (barcodeCount % barcodesPerPage === 0 && barcodeCount < totalBarcodes) {
//                         doc.addPage();
//                         currentPage++;
//                     }
//                 }
//             }

//             // Finalize PDF
//             doc.end();

//             writeStream.on("finish", () => {
//                 resolve({
//                     message: "PDF generated successfully!",
//                     // downloadLink: `${BASE_URL}/barcodes/pub/${pdfFileName}`,
//                     downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${pdfFileName}`,
//                     filePath: pdfFilePath,
//                 });
//             });

//             writeStream.on("error", (err) => reject(err));
//         } catch (error) {
//             reject(error);
//         }
//     });
// };



// function calculateISBN13CheckDigit(isbn12) {
//     let sum = 0;
//     for (let i = 0; i < 12; i++) {
//         const digit = parseInt(isbn12[i], 10);
//         sum += (i % 2 === 0) ? digit : digit * 3;
//     }
//     const remainder = sum % 10;
//     return remainder === 0 ? 0 : 10 - remainder;
// }

// const generateBarcodesAndExcel = async (req,totalBarcodes = 100000, bookId = 1, classLevel = 1, perPage = 10000) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             ensureDirectoryExists(BARCODE_DIR);
//             const excelFileName = `isbn-barcode-${Date.now()}.xlsx`;
//             const excelFilePath = path.join(BARCODE_DIR, excelFileName);

//             const workbook = new ExcelJS.Workbook();
//             const barcodesPerSheet = perPage || 10000; // fallback default
//             const chunkSize = 1000;
//             let globalIndex = 0;

//             const totalSheets = Math.ceil(totalBarcodes / barcodesPerSheet);
//             const bookIdStr = String(bookId).padStart(3, '0');         // 3 digits
//             const classLevelStr = String(classLevel).padStart(2, '0'); // 2 digits
//             const prefix = `${bookIdStr}${classLevelStr}`;             // 5 digits
//             const serialLength = 8;

//             for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
//                 const sheet = workbook.addWorksheet(`Sheet-${sheetIndex + 1}`);
//                 sheet.columns = [
//                     // { header: 'S.No', key: 'serial', width: 10 },
//                     { header: 'Barcode No', key: 'isbn', width: 20 },
//                 ];

//                 const remaining = totalBarcodes - globalIndex;
//                 const sheetBarcodes = Math.min(remaining, barcodesPerSheet);

//                 for (let i = 0; i < sheetBarcodes; i += chunkSize) {
//                     const chunk = Math.min(chunkSize, sheetBarcodes - i);
//                     const barcodeList = Array.from({ length: chunk }, (_, k) => {
//                         const serialPart = (globalIndex + k + 1).toString().padStart(serialLength, '0');
//                         return prefix + serialPart;
//                     });

//                     for (let j = 0; j < chunk; j++) {
//                         const isbn = barcodeList[j];
//                         const serialNumber = globalIndex + 1;
//                         sheet.addRow({ serial: serialNumber, isbn });

//                         globalIndex++;
//                         if (globalIndex >= totalBarcodes) break;
//                     }
//                 }
//             }

//             await workbook.xlsx.writeFile(excelFilePath);

//             resolve({
//                 message: "Excel file generated successfully!",
//                 // downloadLink: `${BASE_URL}/barcodes/pub/${excelFileName}`,
//                 downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${excelFileName}`,
//                 filePath: excelFilePath,
//             });
//         } catch (err) {
//             reject(err);
//         }
//     });
// };

// const generateBarcodePDFHandler = async (req, res) => {
//     /* #swagger.tags = ['Publishers Orders'] */
//     /* #swagger.security = [{"Bearer": []}] */
//     try {
//         const {  order_id } = req.params; // Get count from query param
//         const orderId = parseInt(order_id); // Ensure order_id is an integer
//         const user_id = req.user.user_id;

//         const result = await pool.query(
//             `SELECT ba.id, ba.quantity, ba.assigned_date
//          FROM tbc_book_assignments ba
//          JOIN tbc_books b ON ba.book_id = b.id
//          WHERE ba.publisher_id = $1 and ba.id = $2
//          ORDER BY ba.assigned_date DESC`,
//             [user_id, orderId]
//         );
//         const quantity = Math.ceil(Number(result.rows[0].quantity) * 1.05);

//         const response = await generateBarcodesAndPDF(req,quantity);    

//         res.status(200).json({
//             success: true,
//             message: response.message,
//             downloadLink: response.downloadLink,
//             filePath: response.filePath
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, message: "Error generating PDF", error: error.message });
//     }
// };

// const generateBarcodeExcelHandler = async (req, res) => {
//     try {
//         const { order_id, book_id, class_level, per_page } = req.body;
//         const orderId = parseInt(order_id); // Ensure order_id is an integer
//         const bookId = parseInt(book_id); // Ensure book_id is an integer
//         const classLevel = parseInt(class_level); // Ensure class_level is an integer
//         const perPage = parseInt(per_page); // Ensure per_page is an integer
//         const user_id = req.user.user_id;

//         const result = await pool.query(
//             `SELECT ba.id, ba.quantity, ba.assigned_date
//              FROM tbc_book_assignments ba
//              JOIN tbc_books b ON ba.book_id = b.id
//              WHERE ba.publisher_id = $1 AND ba.id = $2
//              ORDER BY ba.assigned_date DESC`,
//             [user_id, orderId]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         const quantity = Math.ceil(Number(result.rows[0].quantity) * 1.05);
//         const response = await generateBarcodesAndExcel(req,quantity, bookId, classLevel, perPage);

//         res.status(200).json({
//             success: true,
//             message: response.message,
//             downloadLink: response.downloadLink,
//             filePath: response.filePath,
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "Error generating Excel file",
//             error: error.message,
//         });
//     }
// };


module.exports = { getPubOrders, getPubOrdersById,publisherVerifyContent };