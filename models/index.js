// models/index.js
const { pool } = require('../config/db');

//master Tables

const { createMstDeoTable } = require('./masterTables/mstDeoModel');
const { createProgrammersTable } = require('./masterTables/mstProgrammersModel');
const { createMstBeoTable } = require('./masterTables/mstBeoModel');
const { createMstCacTable } = require('./masterTables/mstCacModel');
const { createMstSchoolsTable } = require('./masterTables/mstSchoolsModel');
const { createPublisherTable } = require('./masterTables/mstPublisherModel');
const { createMstDepotTable } = require('./masterTables/mstDipotModel');
const { createSchoolEnrolment } = require('./schoolEnrollmentModel');
const { createMstTeacher } = require('./masterTables/mstTeacher');
const { createMstUdiseTeacher } = require('./masterTables/mstUdiseTeacher');


//master drop down

const { createDistrictTable } = require('./masterDropDown/mstDistrictModel');
const { createBlockTable } = require('./masterDropDown/mstBlockModel');
const { createClusterTable } = require('./masterDropDown/mstClusterModel');
const { createMediumTable } = require('./masterDropDown/mstMediumModel');
const { createMstDivisionTable } = require('./masterTables/mstDivisionModel');



const { createUserTable } = require('./usersModel');
// const { createPublisherTable } = require('./publishersModel');
const { createSubjectTable } = require('./subjectsModel');
const { createRolesTable } = require('./rolesModel');
const { subjectAssignment } = require('./subjectAssignModel');
const { insertValueInTables } = require('./insertValue');
const { createBooksTable } = require('./booksModel');
const { createIsbnTable } = require('./isbnModel');
const { createNotificationTable } = require('./notificationModel');
const { createBookAssignTable } = require('./bookAssignModel');
const { createBarcodeList } = require('./uniqueBarcodesModel');
const { createChallanTbl } = require('./deoptChallanModel');
const { createSchBookDistribution } = require('./schBookDistributionModel');
const { createChallanTable } = require('./challanModel');
const { createStudentCounts  } = require('./studentCountsModel');




const initializeDatabase = async () => {
  try {
    // await createPublisherTable();
    await createDistrictTable();
    await createBlockTable();
    await createMediumTable();
    await createClusterTable();
    await createSubjectTable();
    await createRolesTable();
    await createUserTable();
    await createNotificationTable();
    await subjectAssignment();
    await createIsbnTable();
    await createBooksTable();
    await createBookAssignTable();
    await createMstTeacher();
    await createMstUdiseTeacher();
    await createMstCacTable();
    await createMstSchoolsTable();
    await createMstDepotTable();
    await createProgrammersTable();
    await createMstDeoTable();
    await createMstBeoTable();
    await createPublisherTable();
    await createSchoolEnrolment();
    await subjectAssignment();
    await createIsbnTable();
    await createBooksTable();
    await createBookAssignTable();
    await createBarcodeList();
    await createChallanTbl();
    await createDistrictTable();
    await createBlockTable();
    await createClusterTable();
    await createPublisherTable();
    await createSchoolEnrolment();
    await createSchBookDistribution();
    await createMstDivisionTable();
    await createChallanTable();
    await createStudentCounts();

    // await createFunctionAndTrigger();


    await insertValueInTables();
    console.log('🏁 All tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};


module.exports = { initializeDatabase };