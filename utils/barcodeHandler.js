const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Pool } = require('pg');
const crypto = require('crypto');
const bwipjs = require('bwip-js');

const pool = new Pool({
    user: 'your_db_user',
    host: 'your_db_host',
    database: 'your_db_name',
    password: 'your_db_password',
    port: 5432
});

const BARCODE_DIR = path.join(__dirname, '..', 'barcodes', 'pub');

function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function deleteExistingFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function generateBarcodeImage(barcode) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: barcode,
            scale: 3,
            height: 20,
            includetext: true,
            textxalign: 'center'
        }, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
}

async function getLastUsedNumber(userId) {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT end_number FROM user_barcode_batches WHERE user_id = $1 ORDER BY end_number DESC LIMIT 1`, [userId]);
        return res.rows.length > 0 ? res.rows[0].end_number : 0;
    } catch (error) {
        console.error("Database error:", error);
        return 0;
    } finally {
        client.release();
    }
}

async function storeOrUpdateBarcodeBatch(userId, startNumber, endNumber, fileUniqueCode, fileName) {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT id FROM user_barcode_batches WHERE file_unique_code = $1`, [fileUniqueCode]);
        
        if (res.rows.length > 0) {
            await client.query(`
                UPDATE user_barcode_batches 
                SET start_number = $2, end_number = $3, file_name = $4, updated_at = NOW()
                WHERE file_unique_code = $1
            `, [fileUniqueCode, startNumber, endNumber, fileName]);
        } else {
            await client.query(`
                INSERT INTO user_barcode_batches (user_id, start_number, end_number, file_unique_code, file_name) 
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, startNumber, endNumber, fileUniqueCode, fileName]);
        }
    } catch (error) {
        console.error("Database insert/update error:", error);
    } finally {
        client.release();
    }
}

async function generateBarcodesAndPDF(userId, totalBarcodes = 100, fileUniqueCode) {
    ensureDirectoryExists(BARCODE_DIR);
    const pdfFileName = `isbn-barcode-${fileUniqueCode}.pdf`;
    const pdfFilePath = path.join(BARCODE_DIR, pdfFileName);

    await deleteExistingFile(pdfFilePath);

    const barcodesPerPage = 50, numRows = 9, numCols = 5;
    const pageWidth = 595 - 20, pageHeight = 842 - 20;
    const colWidth = pageWidth / numCols, rowHeight = pageHeight / numRows;
    const barcodeWidth = 95, barcodeHeight = 55;

    const prefix = 'BRC', timestamp = Math.floor(Date.now() / 1000).toString(16);
    let startNumber = await getLastUsedNumber(userId) + 1;
    let endNumber = startNumber + totalBarcodes - 1;
    let barcodes = [];

    for (let i = startNumber; i <= endNumber; i++) {
        const hexNumber = i.toString(16).padStart(8, '0');
        const combined = `${prefix}${timestamp}${hexNumber}`;
        const checksum = crypto.createHash('sha256').update(combined).digest('hex').slice(0, 2);
        barcodes.push(`${combined}${checksum}`);
    }

    await storeOrUpdateBarcodeBatch(userId, startNumber, endNumber, fileUniqueCode, pdfFileName);

    const doc = new PDFDocument({ size: "A4", margin: 10 });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    let x = 10, y = 10, barcodeCount = 0;

    for (let i = 0; i < barcodes.length; i++) {
        const barcode = barcodes[i];
        const barcodeImage = await generateBarcodeImage(barcode);

        doc.image(barcodeImage, x + (colWidth - barcodeWidth) / 2, y, { width: barcodeWidth, height: barcodeHeight });
        doc.text(barcode, x + (colWidth - barcodeWidth) / 2, y + barcodeHeight + 2, { width: barcodeWidth, align: 'center' });

        barcodeCount++;
        x += colWidth;

        if (barcodeCount % numCols === 0) {
            x = 10;
            y += rowHeight;
        }
        if (barcodeCount % (numRows * numCols) === 0 && i !== barcodes.length - 1) {
            doc.addPage();
            x = 10;
            y = 10;
        }
    }

    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
            resolve({
                message: "PDF generated successfully!",
                downloadLink: `${BASE_URL}/barcodes/pub/${pdfFileName}`,
                filePath: pdfFilePath,
                startNumber,
                endNumber
            });
        });
        writeStream.on("error", (err) => reject(err));
    });
}

