const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver')


const jobQueue = [];
const jobResults = new Map();
let isProcessing = false;

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'http://localhost';
const BASE_URL = `${HOST}:${PORT}`;
const PARENT_DIR = path.join(__dirname, '../..');
const BARCODE_DIR = path.join(PARENT_DIR, 'barcodes', 'pub');

const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const generateBarcodeImage = async (isbn, color = '000000') => {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: "code128", // Barcode type
            text: isbn,
            scale: 2,
            height: 10,
            includetext: true,
            textxalign: "center",
            backgroundcolor: "ffffff",
            barcolor: color,
        }, (err, png) => {
            if (err) {
                return reject(err);
            }
            resolve(png);
        });
    });
};

// Barcode range generator
const generateBarcodeRange = (orderId, userId, startSerial, count) => {
    const barcodes = [];
    const orderStr = String(orderId).padStart(3, '0');
    const userStr = String(userId).padStart(3, '0');
    for (let i = 0; i < count; i++) {
        const serialStr = String(startSerial + i).padStart(8, '0');
        barcodes.push(`${orderStr}${userStr}${serialStr}`);
    }
    return barcodes;
};

// Fetch or Create barcode range
// Fetch or Create barcode range
const getOrCreateBarcodeRange = async (publisherId, orderId, bookId, classLevel, quantity) => {
    // Check existing record
    const existing = await pool.query(
        `SELECT * FROM tbc_generated_barcodes 
         WHERE publisher_id = $1 AND order_id = $2 AND book_id = $3 AND class_level = $4`,
        [publisherId, orderId, bookId, classLevel]
    );

    if (existing.rows.length > 0) {
        const { start_barcode, end_barcode } = existing.rows[0];
        const startSerial = parseInt(start_barcode.slice(6)); // extract serial part
        const endSerial = parseInt(end_barcode.slice(6));
        const barcodeList = generateBarcodeRange(orderId, publisherId, startSerial, endSerial - startSerial + 1);
        return { barcodeList };
    } else {
        // Start new range
        const last = await pool.query(`SELECT end_barcode FROM tbc_generated_barcodes WHERE publisher_id=$1 AND order_id=$2 AND book_id=$3 AND class_level=$4 ORDER BY id DESC LIMIT 1`,[publisherId, orderId, bookId, classLevel]);
        let nextSerial = 1;
        if (last.rows.length > 0) {
            const lastBarcode = last.rows[0].end_barcode;
            nextSerial = parseInt(lastBarcode.slice(6)) + 1;
        }

        const barcodeList = generateBarcodeRange(orderId, publisherId, nextSerial, quantity);

        // Insert new record
        await pool.query(
            `INSERT INTO tbc_generated_barcodes (publisher_id, order_id, book_id, class_level, start_barcode, end_barcode)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [publisherId, orderId, bookId, classLevel, barcodeList[0], barcodeList[barcodeList.length - 1]]
        );

        return { barcodeList };
    }
};


const processQueue = async () => {
    if (isProcessing || jobQueue.length === 0) return;
    isProcessing = true;

    const { jobId, barcodeList, maxBarcodesPerPDF, protocol, host, order_id, user_id, resolve, reject } = jobQueue.shift();

    // Initialize job status
    jobResults.set(jobId, {
        status: 'processing',
        totalBarcodes: barcodeList.length,
        processedBarcodes: 0,
        timestamp: Date.now()
    });

    try {
        const response = await generateBarcodesAndZipPDFs(
            { protocol, get: () => host },
            barcodeList,
            maxBarcodesPerPDF,
            jobId // Pass jobId for progress tracking
        );

        jobResults.set(jobId, {
            status: 'completed',
            success: true,
            message: response.message,
            downloadLink: response.downloadLink,
            zipFilePath: response.zipFilePath,
            totalBarcodes: barcodeList.length,
            processedBarcodes: barcodeList.length,
            timestamp: Date.now()
        });

        const totalBarcodes = barcodeList.length;
        const totalPDFs = Math.ceil(totalBarcodes / maxBarcodesPerPDF);
        console.log(`[INFO] ${new Date().toISOString()} - Generated ${totalBarcodes} barcodes across ${totalPDFs} PDFs for order ${order_id}. ZIP file: ${path.basename(response.zipFilePath)}`);

        resolve(response);
    } catch (error) {
        console.error(`[ERROR] Failed to process job ${jobId} for ${barcodeList.length} barcodes:`, error);
        jobResults.set(jobId, {
            status: 'failed',
            success: false,
            message: "Error generating ZIP",
            error: error.message,
            totalBarcodes: barcodeList.length,
            processedBarcodes: jobResults.get(jobId).processedBarcodes,
            timestamp: Date.now()
        });
        reject(error);
    } finally {
        isProcessing = false;
        setImmediate(processQueue); // Process next job
    }
};


// PDF Generation
const generateBarcodesAndPDF = async (req, barcodes) => {
    return new Promise(async (resolve, reject) => {
        try {
            ensureDirectoryExists(BARCODE_DIR);

            const pdfFileName = `isbn-barcode-${Date.now()}.pdf`;
            const pdfFilePath = path.join(BARCODE_DIR, pdfFileName);

            const doc = new PDFDocument({ size: "A4", margin: 5 });
            const writeStream = fs.createWriteStream(pdfFilePath);
            doc.pipe(writeStream);

            const numRows = 14;
            const numCols = 4;
            const pageWidth = doc.page.width - doc.options.margin * 1;
            const pageHeight = doc.page.height;
            const colWidth = pageWidth / numCols;
            const rowHeight = pageHeight / numRows;
            const barcodeWidth = 110;
            const barcodeHeight = 40;
            const barcodesPerPage = numRows * numCols;
            const batchSize = 1000; // Process 1,000 barcodes at a time

            let barcodeCount = 0;

            // Process barcodes in batches
            for (let i = 0; i < barcodes.length; i += batchSize) {
                const batch = barcodes.slice(i, i + batchSize);

                for (const isbn of batch) {
                    const row = Math.floor(barcodeCount / numCols) % numRows;
                    const col = barcodeCount % numCols;

                    const barcodeImage = await generateBarcodeImage(isbn);

                    const x = col * colWidth + (colWidth - barcodeWidth) / 2;
                    const y = row * rowHeight + (rowHeight - barcodeHeight) / 2;

                    doc.image(barcodeImage, x, y, { width: barcodeWidth, height: barcodeHeight });

                    barcodeCount++;

                    if (barcodeCount % barcodesPerPage === 0 && barcodeCount < barcodes.length) {
                        doc.addPage();
                    }
                }

                // Optional: Force garbage collection or clear memory
                if (global.gc) global.gc();
            }

            doc.end();

            writeStream.on("finish", () => {
                resolve({
                    message: "PDF generated successfully!",
                    downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${pdfFileName}`,
                    filePath: pdfFilePath,
                });
            });

            writeStream.on("error", (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};

// Excel Generation
// const generateBarcodesAndExcel = async (req, barcodes) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             ensureDirectoryExists(BARCODE_DIR);

//             const excelFileName = `isbn-barcode-${Date.now()}.xlsx`;
//             const excelFilePath = path.join(BARCODE_DIR, excelFileName);

//             const workbook = new ExcelJS.Workbook();
//             const sheet = workbook.addWorksheet('Barcodes');

//             sheet.columns = [{ header: 'Barcode No', key: 'isbn', width: 20 }];

//             for (const isbn of barcodes) {
//                 sheet.addRow({ isbn });
//             }

//             await workbook.xlsx.writeFile(excelFilePath);

//             resolve({
//                 message: "Excel file generated successfully!",
//                 downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${excelFileName}`,
//                 filePath: excelFilePath,
//             });
//         } catch (error) {
//             reject(error);
//         }
//     });
// };


const generateBarcodesAndExcel1 = async (req, barcodes, quantityPerSheet) => {
    return new Promise(async (resolve, reject) => {
        try {
            ensureDirectoryExists(BARCODE_DIR);

            const excelFileName = `isbn-barcode-${Date.now()}.xlsx`;
            const excelFilePath = path.join(BARCODE_DIR, excelFileName);

            const workbook = new ExcelJS.Workbook();

            const totalSheets = Math.ceil(barcodes.length / quantityPerSheet);

            for (let i = 0; i < totalSheets; i++) {
                const sheet = workbook.addWorksheet(`Sheet-${i + 1}`);
                sheet.columns = [{ header: 'Barcode No', key: 'isbn', width: 20 }];

                const start = i * quantityPerSheet;
                const end = start + quantityPerSheet;
                const slice = barcodes.slice(start, end);

                slice.forEach(isbn => {
                    sheet.addRow({ isbn });
                });
            }

            await workbook.xlsx.writeFile(excelFilePath);

            resolve({
                message: "Excel file with multiple sheets generated successfully!",
                downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${excelFileName}`,
                filePath: excelFilePath,
            });
        } catch (error) {
            reject(error);
        }
    });
};

const generateBarcodesAndExcel = async (req, barcodes, quantityPerSheet, subjectName, classLevel, userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            ensureDirectoryExists(BARCODE_DIR);

            const cleanName = subjectName.toLowerCase().replace(/[^a-z0-9]/gi, '_'); // sanitize
            const excelFileName = `B${userId}_${cleanName}-class_${classLevel}.xlsx`;
            const excelFilePath = path.join(BARCODE_DIR, excelFileName);

            const workbook = new ExcelJS.Workbook();
            const totalSheets = Math.ceil(barcodes.length / quantityPerSheet);

            for (let i = 0; i < totalSheets; i++) {
                const sheet = workbook.addWorksheet(`Sheet-${i + 1}`);
                sheet.columns = [{ header: 'Barcode No', key: 'isbn', width: 20 }];

                const start = i * quantityPerSheet;
                const end = start + quantityPerSheet;
                const slice = barcodes.slice(start, end);

                slice.forEach(isbn => {
                    sheet.addRow({ isbn });
                });
            }

            await workbook.xlsx.writeFile(excelFilePath);

            resolve({
                message: "Excel file with multiple sheets generated successfully!",
                downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${excelFileName}`,
                filePath: excelFilePath,
            });
        } catch (error) {
            reject(error);
        }
    });
};


// PDF Handler
const generateBarcodePDFHandler = async (req, res) => {
            const { order_id } = req.params;
        console.log(`[INFO] Received request to generate barcodes for order ${order_id}`);
        const user_id = req.user.user_id;
    try {


        const result = await pool.query(
            `SELECT ba.id, ba.quantity, ba.book_id, b.class_level
             FROM tbc_book_assignments ba
             JOIN tbc_books b ON ba.book_id = b.id
             WHERE ba.publisher_id = $1 AND ba.id = $2`,
            [user_id, order_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const { quantity, book_id, class_level } = result.rows[0];
        const adjustedQuantity = Math.ceil(Number(quantity) * 1.05);

        const { barcodeList } = await getOrCreateBarcodeRange(user_id, order_id, book_id, class_level, adjustedQuantity);

        // Create job
        const jobId = uuidv4();
        console.log(`[INFO] Queued job ${jobId} for ${barcodeList.length} barcodes, order ${order_id}`);
        jobQueue.push({
            jobId,
            barcodeList,
            maxBarcodesPerPDF: 10000,
            protocol: req.protocol,
            host: req.get('host'),
            order_id,
            user_id,
            resolve: () => {},
            reject: () => {}
        });

        // Initialize job status
        jobResults.set(jobId, {
            status: 'queued',
            totalBarcodes: barcodeList.length,
            processedBarcodes: 0,
            timestamp: Date.now()
        });

        // Start processing if not already running
        setImmediate(processQueue);

        res.status(202).json({
            success: true,
            message: "Barcode generation queued",
            jobId
        });

    } catch (error) {
        console.error(`[ERROR] Failed to queue barcode generation for order ${order_id}:`, error);
        res.status(500).json({ success: false, message: "Error queuing task", error: error.message });
    }
};


const checkJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = jobResults.get(jobId);

        if (!result) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        if (result.status === 'completed' && result.success) {
            return res.status(200).json({
                success: true,
                status: result.status,
                message: "Job completed",
                downloadLink: result.downloadLink,
                zipFilePath: result.zipFilePath,
                totalBarcodes: result.totalBarcodes,
                processedBarcodes: result.processedBarcodes
            });
        } else if (result.status === 'failed' || (result.status === 'completed' && !result.success)) {
            return res.status(500).json({
                success: false,
                status: result.status,
                message: result.message || "Job failed",
                error: result.error || "Unknown error",
                totalBarcodes: result.totalBarcodes,
                processedBarcodes: result.processedBarcodes
            });
        } else {
            return res.status(202).json({
                success: true,
                status: result.status,
                message: "Job in progress",
                totalBarcodes: result.totalBarcodes,
                processedBarcodes: result.processedBarcodes
            });
        }
    } catch (error) {
        console.error(`[ERROR] Failed to check job status for job ${req.params.jobId}:`, error);
        res.status(500).json({ success: false, message: "Error checking job status", error: error.message });
    }
};

// Generate multiple PDFs and zip them
const generateBarcodesAndZipPDFs = async (req, barcodes, maxBarcodesPerPDF, jobId) => {
    return new Promise(async (resolve, reject) => {
        try {
            ensureDirectoryExists(BARCODE_DIR);

            const zipFileName = `barcode-batch-${Date.now()}-${uuidv4()}.zip`;
            const zipFilePath = path.join(BARCODE_DIR, zipFileName);
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.pipe(output);

            // Split barcodes into chunks
            const pdfFiles = [];
            let processedBarcodes = jobResults.get(jobId)?.processedBarcodes || 0;

            for (let i = 0; i < barcodes.length; i += maxBarcodesPerPDF) {
                const chunk = barcodes.slice(i, i + maxBarcodesPerPDF);
                const pdfFileName = `isbn-barcode-${Date.now()}-${i / maxBarcodesPerPDF + 1}.pdf`;
                const pdfFilePath = path.join(BARCODE_DIR, pdfFileName);

                await generateSinglePDF(chunk, pdfFilePath);
                archive.file(pdfFilePath, { name: pdfFileName });
                pdfFiles.push(pdfFilePath);

                // Update progress
                processedBarcodes += chunk.length;
                jobResults.set(jobId, {
                    ...jobResults.get(jobId),
                    processedBarcodes,
                    timestamp: Date.now()
                });
            }

            // Finalize the ZIP file
            archive.finalize();

            output.on('close', () => {
                // Clean up individual PDF files
                pdfFiles.forEach((file) => {
                    try {
                        fs.unlinkSync(file);
                    } catch (err) {
                        console.error(`[ERROR] Failed to delete ${file}:`, err);
                    }
                });

                resolve({
                    message: "ZIP file generated successfully!",
                    downloadLink: `${req.protocol}://${req.get('host')}/barcodes/pub/${zipFileName}`,
                    zipFilePath
                });
            });

            archive.on('error', (err) => reject(err));
        } catch (error) {
            console.error(`[ERROR] Failed to generate ZIP for ${barcodes.length} barcodes:`, error);
            reject(error);
        }
    });
};

// Generate a single PDF for a chunk of barcodes
const generateSinglePDF = async (barcodes, pdfFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 5 });
            const writeStream = fs.createWriteStream(pdfFilePath);
            doc.pipe(writeStream);

            const numRows = 14;
            const numCols = 4;
            const pageWidth = doc.page.width - doc.options.margin * 1;
            const pageHeight = doc.page.height;
            const colWidth = pageWidth / numCols;
            const rowHeight = pageHeight / numRows;
            const barcodeWidth = 110;
            const barcodeHeight = 40;
            const barcodesPerPage = numRows * numCols;
            const batchSize = 1000; // Process 1000 barcodes at a time

            let barcodeCount = 0;

            // Process barcodes in batches
            for (let i = 0; i < barcodes.length; i += batchSize) {
                const batch = barcodes.slice(i, i + batchSize);
                for (const isbn of batch) {
                    const row = Math.floor(barcodeCount / numCols) % numRows;
                    const col = barcodeCount % numCols;

                    const barcodeImage = await generateBarcodeImage(isbn);

                    const x = col * colWidth + (colWidth - barcodeWidth) / 2;
                    const y = row * rowHeight + (rowHeight - barcodeHeight) / 2;

                    doc.image(barcodeImage, x, y, { width: barcodeWidth, height: barcodeHeight });

                    barcodeCount++;

                    if (barcodeCount % barcodesPerPage === 0 && barcodeCount < barcodes.length) {
                        doc.addPage();
                    }
                }
                // Clear memory
                if (global.gc) global.gc();
            }

            doc.end();

            writeStream.on("finish", () => resolve());
            writeStream.on("error", (err) => reject(err));
        } catch (error) {
            console.error(`[ERROR] Failed to generate PDF for ${barcodes.length} barcodes:`, error);
            reject(error);
        }
    });
};

// Excel Handler
// const generateBarcodeExcelHandler = async (req, res) => {
//     try {
//         const { order_id, book_id, class_level } = req.body;
//         const user_id = req.user.user_id;

//         const result = await pool.query(
//             `SELECT ba.id, ba.quantity
//              FROM tbc_book_assignments ba
//              WHERE ba.publisher_id = $1 AND ba.id = $2`,
//             [user_id, order_id]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         const { quantity } = result.rows[0];
//         const adjustedQuantity = Math.ceil(Number(quantity) * 1.05);

//         const { barcodeList } = await getOrCreateBarcodeRange(user_id, order_id, book_id, class_level, adjustedQuantity);

//         const response = await generateBarcodesAndExcel(req, barcodeList);

//         res.status(200).json({
//             success: true,
//             message: response.message,
//             downloadLink: response.downloadLink,
//             filePath: response.filePath
//         });

//     } catch (error) {
//         res.status(500).json({ success: false, message: "Error generating Excel file", error: error.message });
//     }
// };


const generateBarcodeExcelHandler1 = async (req, res) => {
    try {
        const { order_id, book_id, class_level, quantityPerSheet } = req.body;
        const user_id = req.user.user_id;

        const result = await pool.query(
            `SELECT ba.id, ba.quantity
             FROM tbc_book_assignments ba
             WHERE ba.publisher_id = $1 AND ba.id = $2`,
            [user_id, order_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const { quantity } = result.rows[0];
        const adjustedQuantity = Math.ceil(Number(quantity) * 1.05);

        const { barcodeList } = await getOrCreateBarcodeRange(user_id, order_id, book_id, class_level, adjustedQuantity);

        const response = await generateBarcodesAndExcel(req, barcodeList, parseInt(quantityPerSheet));

        res.status(200).json({
            success: true,
            message: response.message,
            downloadLink: response.downloadLink,
            filePath: response.filePath
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating Excel file", error: error.message });
    }
};

const generateBarcodeExcelHandler = async (req, res) => {
    try {
        const { order_id, book_id, class_level, quantityPerSheet } = req.body;
        const user_id = req.user.user_id;

        const orderResult = await pool.query(
            `SELECT ba.id, ba.quantity
             FROM tbc_book_assignments ba
             WHERE ba.publisher_id = $1 AND ba.id = $2`,
            [user_id, order_id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const { quantity } = orderResult.rows[0];
        const adjustedQuantity = Math.ceil(Number(quantity) * 1.05);

        // 🧠 Fetch subject name and class_level from book_id
        const subjectResult = await pool.query(
            `SELECT ms.name AS subject_name, ms.class_level
             FROM tbc_books tb
             JOIN mst_subjects ms ON tb.subject_id = ms.id
             WHERE tb.id = $1`,
            [book_id]
        );

        if (subjectResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Book or Subject not found" });
        }

        const { subject_name, class_level: fetchedClassLevel } = subjectResult.rows[0];

        const { barcodeList } = await getOrCreateBarcodeRange(
            user_id,
            order_id,
            book_id,
            class_level,
            adjustedQuantity
        );

        const response = await generateBarcodesAndExcel(
            req,
            barcodeList,
            parseInt(quantityPerSheet),
            subject_name,
            fetchedClassLevel,
            user_id 
        );

        res.status(200).json({
            success: true,
            message: response.message,
            downloadLink: response.downloadLink,
            filePath: response.filePath
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating Excel file", error: error.message });
    }
};


module.exports = { generateBarcodePDFHandler, generateBarcodeExcelHandler, checkJobStatus };
