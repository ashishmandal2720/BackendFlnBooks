const { Pool } = require('pg'); // Assuming you are using the 'pg' library for PostgreSQL
const fs = require('fs'); // Node.js File System module
const path = require('path'); // Node.js Path module
const bwipjs = require('bwip-js'); // Barcode generation library

// --- Database Configuration ---
// Uses environment variables for security. Ensure these are set in your environment.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// --- Helper function to sanitize names for filesystem paths ---
const sanitizeName = (name) => {
    if (!name) return 'unknown';
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_');
};

// --- Data Mapping from your document ---
const userMap = {
    2: 'Ankit Prakashan',
    3: 'Sri Ram Printers',
    4: 'Techno Printers',
    5: 'Sharda Offset',
};

const subjectMap = {
    1: 'IT/Ites', 2: 'Automotive', 3: 'Retail', 4: 'Agriculture', 5: 'Health Care',
    6: 'BFSI', 7: 'Telecommunication', 8: 'Beauty & Wellness', 9: 'Electronics & Hardware',
    10: 'Media & Entertainment', 11: 'Tourism & Hospitality', 12: 'Construction',
    13: 'Plumbing', 14: 'Apparel, Made-Ups, and Home Furnishing', 15: 'Power',
    16: 'IT/Ites', 17: 'Automotive', 18: 'Retail', 19: 'Agriculture', 20: 'Health Care',
    21: 'BFSI', 22: 'Telecommunication', 23: 'Beauty & Wellness', 24: 'Electronics & Hardware',
    25: 'Media & Entertainment', 26: 'Tourism & Hospitality', 27: 'Construction',
    28: 'Plumbing', 29: 'Apparel Made-Ups and Home Furnishing', 30: 'Power',
    31: 'IT/Ites', 32: 'Automotive', 33: 'Retail', 34: 'Agriculture', 35: 'Health Care',
    36: 'BFSI', 37: 'Telecommunication', 38: 'Beauty & Wellness', 39: 'Electronics & Hardware',
    40: 'Media & Entertainment', 41: 'IT/Ites', 42: 'Automotive', 43: 'Retail',
    44: 'Agriculture', 45: 'Health Care', 46: 'BFSI', 47: 'Telecommunication',
    48: 'Beauty & Wellness', 49: 'Electronics & Hardware', 50: 'Media & Entertainment',
};

// --- Enriched Data with User Names, Subject Names, and Quantities ---
const bookData = [
    // Data from "For 592 Schools"
    { publisher_id: 3, subject_id: 1, class_level: '9', quantity: 9000 }, { publisher_id: 3, subject_id: 2, class_level: '9', quantity: 5000 },
    { publisher_id: 3, subject_id: 3, class_level: '9', quantity: 5000 }, { publisher_id: 3, subject_id: 4, class_level: '9', quantity: 8000 },
    { publisher_id: 3, subject_id: 5, class_level: '9', quantity: 13000 }, { publisher_id: 3, subject_id: 6, class_level: '9', quantity: 3000 },
    { publisher_id: 3, subject_id: 7, class_level: '9', quantity: 5000 }, { publisher_id: 3, subject_id: 8, class_level: '9', quantity: 2000 },
    { publisher_id: 3, subject_id: 9, class_level: '9', quantity: 2000 }, { publisher_id: 3, subject_id: 10, class_level: '9', quantity: 3000 },
    { publisher_id: 4, subject_id: 16, class_level: '10', quantity: 7500 }, { publisher_id: 4, subject_id: 17, class_level: '10', quantity: 4200 },
    { publisher_id: 4, subject_id: 18, class_level: '10', quantity: 4000 }, { publisher_id: 4, subject_id: 19, class_level: '10', quantity: 5000 },
    { publisher_id: 4, subject_id: 20, class_level: '10', quantity: 11000 }, { publisher_id: 4, subject_id: 21, class_level: '10', quantity: 3500 },
    { publisher_id: 4, subject_id: 22, class_level: '10', quantity: 4000 }, { publisher_id: 4, subject_id: 23, class_level: '10', quantity: 1400 },
    { publisher_id: 4, subject_id: 24, class_level: '10', quantity: 2500 }, { publisher_id: 4, subject_id: 25, class_level: '10', quantity: 3000 },
    { publisher_id: 2, subject_id: 31, class_level: '11', quantity: 6000 }, { publisher_id: 2, subject_id: 32, class_level: '11', quantity: 3000 },
    { publisher_id: 2, subject_id: 33, class_level: '11', quantity: 3000 }, { publisher_id: 2, subject_id: 34, class_level: '11', quantity: 4000 },
    { publisher_id: 2, subject_id: 35, class_level: '11', quantity: 8200 }, { publisher_id: 2, subject_id: 36, class_level: '11', quantity: 2200 },
    { publisher_id: 2, subject_id: 37, class_level: '11', quantity: 3000 }, { publisher_id: 2, subject_id: 38, class_level: '11', quantity: 1000 },
    { publisher_id: 2, subject_id: 39, class_level: '11', quantity: 1200 }, { publisher_id: 2, subject_id: 40, class_level: '11', quantity: 2000 },
    { publisher_id: 5, subject_id: 41, class_level: '12', quantity: 6000 }, { publisher_id: 5, subject_id: 42, class_level: '12', quantity: 3000 },
    { publisher_id: 5, subject_id: 43, class_level: '12', quantity: 3000 }, { publisher_id: 5, subject_id: 44, class_level: '12', quantity: 4000 },
    { publisher_id: 5, subject_id: 45, class_level: '12', quantity: 9000 }, { publisher_id: 5, subject_id: 46, class_level: '12', quantity: 2600 },
    { publisher_id: 5, subject_id: 47, class_level: '12', quantity: 3000 }, { publisher_id: 5, subject_id: 48, class_level: '12', quantity: 1000 },
    { publisher_id: 5, subject_id: 49, class_level: '12', quantity: 1400 }, { publisher_id: 5, subject_id: 50, class_level: '12', quantity: 2000 },
    // Data from "For 652 Schools"
    { publisher_id: 5, subject_id: 1, class_level: '9', quantity: 13000 }, { publisher_id: 5, subject_id: 2, class_level: '9', quantity: 5000 },
    { publisher_id: 5, subject_id: 3, class_level: '9', quantity: 2500 }, { publisher_id: 5, subject_id: 4, class_level: '9', quantity: 1300 },
    { publisher_id: 5, subject_id: 5, class_level: '9', quantity: 10000 }, { publisher_id: 5, subject_id: 6, class_level: '9', quantity: 4000 },
    { publisher_id: 5, subject_id: 7, class_level: '9', quantity: 1000 }, { publisher_id: 5, subject_id: 8, class_level: '9', quantity: 2000 },
    { publisher_id: 5, subject_id: 9, class_level: '9', quantity: 2000 }, { publisher_id: 5, subject_id: 11, class_level: '9', quantity: 4000 },
    { publisher_id: 5, subject_id: 12, class_level: '9', quantity: 3000 }, { publisher_id: 5, subject_id: 13, class_level: '9', quantity: 4000 },
    { publisher_id: 5, subject_id: 14, class_level: '9', quantity: 3000 }, { publisher_id: 5, subject_id: 15, class_level: '9', quantity: 6000 },
    { publisher_id: 5, subject_id: 16, class_level: '10', quantity: 6200 }, { publisher_id: 5, subject_id: 17, class_level: '10', quantity: 1500 },
    { publisher_id: 5, subject_id: 18, class_level: '10', quantity: 1100 }, { publisher_id: 5, subject_id: 19, class_level: '10', quantity: 620 },
    { publisher_id: 5, subject_id: 20, class_level: '10', quantity: 4620 }, { publisher_id: 5, subject_id: 21, class_level: '10', quantity: 1980 },
    { publisher_id: 5, subject_id: 22, class_level: '10', quantity: 120 }, { publisher_id: 5, subject_id: 23, class_level: '10', quantity: 720 },
    { publisher_id: 5, subject_id: 24, class_level: '10', quantity: 840 }, { publisher_id: 5, subject_id: 26, class_level: '10', quantity: 1980 },
    { publisher_id: 5, subject_id: 27, class_level: '10', quantity: 1160 }, { publisher_id: 5, subject_id: 28, class_level: '10', quantity: 1520 },
    { publisher_id: 5, subject_id: 29, class_level: '10', quantity: 1120 }, { publisher_id: 5, subject_id: 30, class_level: '10', quantity: 2600 },
].map(book => ({
    ...book,
    userName: sanitizeName(userMap[book.publisher_id]),
    subjectName: sanitizeName(subjectMap[book.subject_id]),
}));

/**
 * Calculates the checksum for a 12-digit ISBN prefix.
 */
const calculateISBNChecksum = (isbnWithoutChecksum) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbnWithoutChecksum[i]);
        sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum.toString();
};

/**
 * Generates a 13-digit ISBN based on publisher and subject IDs.
 */
const generateISBNFN = async (publisher_id, subject_id) => {
    const prefix = "978";
    const registration_group = "93"; // India
    const fixedLength = prefix.length + registration_group.length;
    const publisherStr = String(publisher_id);
    const subjectStr = String(subject_id);
    const remainingLength = 12 - fixedLength;
    let publisher_code = "";
    let title_identifier = "";
    if (publisherStr.length >= remainingLength) {
        publisher_code = publisherStr.slice(0, remainingLength);
        title_identifier = "";
    } else {
        publisher_code = publisherStr;
        const titleLength = remainingLength - publisherStr.length;
        title_identifier = subjectStr.padStart(titleLength, "0");
    }
    const isbnWithoutChecksum = prefix + registration_group + publisher_code + title_identifier;
    const checksum = calculateISBNChecksum(isbnWithoutChecksum);
    return isbnWithoutChecksum + checksum;
};

/**
 * Generates a barcode image and saves it to a structured path.
 */
const generateBarcode = async (isbnCode, userName, subjectName) => {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: "code128",
            text: isbnCode,
            scale: 3,
            height: 25,
            includetext: true,
            textxalign: "center",
        }, (err, png) => {
            if (err) {
                return reject(err);
            }
            try {
                const dirPath = path.join('barcodes', userName, subjectName);
                fs.mkdirSync(dirPath, { recursive: true });
                const barcodePath = path.join(dirPath, `${isbnCode}.png`);
                fs.writeFileSync(barcodePath, png);
                console.log(`Barcode saved to: ${barcodePath}`);
                resolve(barcodePath);
            } catch (writeError) {
                reject(writeError);
            }
        });
    });
};

/**
 * Processes a single book assignment, creating all related database records
 * within a single transaction.
 */
const processBookAssignment = async (book) => {
    const { publisher_id, subject_id, class_level, userName, subjectName, quantity } = book;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Create the subject assignment record to get its ID.
        const subjectAssignmentQuery = 'INSERT INTO tbc_subject_assignments (publisher_id, subject_id, class_level, current_session, book_cover_path, book_content_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        const subjectAssignmentResult = await client.query(subjectAssignmentQuery, [publisher_id, subject_id, class_level, '2025-26', '/barcodes/cover.png', '/barcodes/content.pdf']);
        const subject_assignment_id = subjectAssignmentResult.rows[0].id;
        console.log(`Created subject assignment with ID: ${subject_assignment_id}`);

        // Step 2: Generate the ISBN.
        const isbn_code = await generateISBNFN(publisher_id, subject_id);
        console.log(`Generated ISBN: ${isbn_code}`);

        // Step 3: Insert into tbc_isbn_codes FIRST to satisfy the foreign key for tbc_books.
        const isbnQuery = 'INSERT INTO tbc_isbn_codes (assignment_id, isbn_code) VALUES ($1, $2) RETURNING *';
        await client.query(isbnQuery, [subject_assignment_id, isbn_code]);
        console.log(`Saved ISBN code for subject assignment ID: ${subject_assignment_id}`);

        // Step 4: Now, create the book record in tbc_books. It can now reference the valid isbn_code.
        const bookQuery = 'INSERT INTO tbc_books (isbn_code, publisher_id, subject_id, class_level, front_cover_url, back_cover_url, content_rcv_yn, content_pub_rcv) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id';
        const bookResult = await client.query(bookQuery, [isbn_code, publisher_id, subject_id, class_level, '/cover.png', '/back_cover.png', 'true', '1']);
        const book_id = bookResult.rows[0].id;
        console.log(`Created book record with ID: ${book_id}`);

        // Step 5: Create the book assignment for quantity, linking to the book_id from Step 4.
        const ccid = (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
        const bookAssignmentQuery = 'INSERT INTO tbc_book_assignments (book_id, publisher_id, unique_identifier, quantity, remaining_qty) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const bookAssignmentResult = await client.query(bookAssignmentQuery, [book_id, publisher_id, ccid, quantity, quantity]);
        const book_assignment_id = bookAssignmentResult.rows[0].id;
        console.log(`Created book assignment with ID ${book_assignment_id} and quantity ${quantity}`);

        // Step 6: Generate barcode and update paths.
        const barcode_path = await generateBarcode(isbn_code, userName, subjectName);
        await client.query('UPDATE tbc_isbn_codes SET barcode_path = $1 WHERE assignment_id = $2', [barcode_path, subject_assignment_id]);
        await client.query('UPDATE tbc_subject_assignments SET book_isbn_path = $1 WHERE id = $2', [barcode_path, subject_assignment_id]);
        console.log(`Updated paths with barcode: ${barcode_path}`);

        await client.query('COMMIT');
        console.log(`--- Successfully processed assignment for subject ${subject_id} ---`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`--- FAILED to process assignment for subject ${subject_id}. Rolled back transaction. ---`);
        console.error('Error:', error.message);
    } finally {
        client.release();
    }
};

/**
 * Main function to iterate through all book data and insert them into the database.
 */
const insertAllBookData = async () => {
    console.log('Starting the full book data insertion process...');
    for (const book of bookData) {
        await processBookAssignment(book);
    }
    console.log('Full book data insertion process finished.');
    await pool.end();
};

// --- Execute the main function ---
// To run this script from the command line, you would typically call insertAllBookData()
// insertAllBookData(); 

// To make it available for import in other files:
module.exports = {
    insertAllBookData
};
