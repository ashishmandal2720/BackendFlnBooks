const { pool } = require('../../config/db');

const sanitizeBigInt = (value) => {
    if (typeof value === "string" && value.trim().toUpperCase() === "NULL") return null;
    if (value === null || value === undefined || value === "") return null;
    return isNaN(Number(value)) ? null : Number(value);
};


const createMstTeacher = async () => {
    const query = `CREATE TABLE IF NOT EXISTS public.mst_teacher
(
    id SERIAL PRIMARY KEY,
    udise_id bigint DEFAULT 0,
    current_udise_id bigint DEFAULT 0,
    teacher_code VARCHAR NOT NULL,
    name_hin VARCHAR,
    name_eng VARCHAR,
    designation_id integer,
    designation_name_eng VARCHAR,
    designation_name_hin VARCHAR,
    mobile_no bigint DEFAULT 0,
    status boolean DEFAULT true,
    role integer DEFAULT 4
);`;
    await pool.query(query);
};


const BATCH_SIZE = 1000;

const bulkInsertNewTeacherData = async (req, res) => {
    try {
        console.log("Fetching the data...");
        const TeacherMsiData = await fetch("https://eduportal.cg.nic.in/VSKAPI/api/VSK/getTeacherVocationalByVSK"); // Replace with real URL
        const response = await TeacherMsiData.json();
        console.log("Data fetched.");

        // Fetch existing teacher codes
        const { rows: existingRows } = await pool.query("SELECT teacher_code FROM public.mst_teacher");
        const existingTeacherCodes = existingRows.map(row => row.teacher_code);

        const newData = response.filter(
            (item) => item.TeacherCode && !existingTeacherCodes.includes(item.TeacherCode)
        );

        if (newData.length === 0) {
            console.log("No new records to insert.");
            //   return res.status(200).json({ success: false, message: "No new records to insert." });
        }

        let totalInserted = 0;

        for (let i = 0; i < newData.length; i += BATCH_SIZE) {
            const batch = newData.slice(i, i + BATCH_SIZE);
            const insertValues = [];
            const placeholders = [];

            batch.forEach((item, index) => {
                const base = index * 9;
                insertValues.push(
                    sanitizeBigInt(item.UDISEID),
                    sanitizeBigInt(item.CurrentPostedUdiseId),
                    item.TeacherCode || null,
                    item.NameHin || null,
                    item.NameEng || null,
                    sanitizeBigInt(item.DesignationID),
                    item.DesignationDesc_Eng || null,
                    item.DesignationDesc_Hin || null,
                    sanitizeBigInt(item.MobileNo)
                );
                placeholders.push(
                    `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`
                );
            });

            const insertQuery = `
        INSERT INTO public.mst_teacher (
          udise_id,
          current_udise_id,
          teacher_code,
          name_hin,
          name_eng,
          designation_id,
          designation_name_eng,
          designation_name_hin,
          mobile_no
        ) VALUES ${placeholders.join(",")}
      `;

            await pool.query(insertQuery, insertValues);
            totalInserted += batch.length;
        }

        console.log(`${totalInserted} new records inserted.`);
        // res.status(200).json({ success: true, message: `${totalInserted} new records inserted.` });
    } catch (error) {
        console.error("Insertion error:", error.message);
        // res.status(500).json({ message: "Internal Server Error" });
    }
};



module.exports = { createMstTeacher };