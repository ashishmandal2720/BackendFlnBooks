const express = require('express');

const router = express.Router();

const authRoutes = require('./authRoutes/authRoutes');
const userRoutes = require('./adminRoutes/userRoutes');
const publisherRoutes = require('./adminRoutes/publisherRoutes');
const subjectRoutes = require('./adminRoutes/subjectRoutes');
const subjectAssignment = require('./adminRoutes/subjectAssignRoutes');
const isbn = require('./adminRoutes/isbnRoutes');
const books = require('./adminRoutes/bookRoutes');
const booksAssign = require('./adminRoutes/bookAssignRoute');
const pub_depot = require('./publisherRoute/depotRoute');
const notification = require('./authRoutes/notificationRoute');
const pub_order = require('./publisherRoute/assignmentRoutes');
const challanRoute = require('./publisherRoute/challanRoutes');
const depotOrder = require('./depotRoutes/depotOrderRoutes');
const depotDeo = require('./depotRoutes/depotToDeoRoutes');
const depotCluster = require('./depotRoutes/depotToClustRoutes');
const depotProfile = require('./depotRoutes/depotProfileRoutes');
const publisherProfile = require('./publisherRoute/pubProfileRoutes');
const deoProfile = require('./deoRoutes/deoProfileRoutes');
const deoTransfer = require('./deoRoutes/deoTransferRoutes');
const clusterProfile = require('./clusterRoutes/clusterProfileRoutes');
const clusterOrder = require('./clusterRoutes/clusterOrderRoutes');
const clusterTchSch = require('./clusterRoutes/clusterTchSchRoutes');
const schoolProfile = require('./schoolsRoutes/schoolProfileRoutes');
const schoolRoutes = require('./schoolsRoutes/schoolRoutes');
const deoOrders = require('./deoRoutes/deoOrderRoutes');
const proProfile = require('./programerRoutes/proProfileRoutes');
const proTchSch = require('./programerRoutes/proTchSchRoutes');
const reportRoutes = require('./adminRoutes/reportsRoutes');

//Admin Routes
const filterRoutes = require('./masterDropDownRoutes')
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/publisher', publisherRoutes);
router.use('/subjects', subjectRoutes);
router.use('/subject-assign', subjectAssignment);
router.use('/isbn', isbn);
router.use('/books', books);
router.use('/book-assign', booksAssign);
router.use('/notification', notification);
router.use('/filter', filterRoutes);


//Publisher Routes
router.use('/pub', publisherProfile);
router.use('/pub/depot', pub_depot);
router.use('/pub/order', pub_order);
router.use('/pub/challan', challanRoute);

//Depot Routes
router.use('/depot', depotProfile);
router.use('/depot/', depotOrder);
router.use('/depot/school', depotOrder);
router.use('/depot/deo', depotDeo);
router.use('/depot/cluster', depotCluster);

//Deo Routes
router.use('/deo', deoProfile);
router.use('/deo/transfer', deoTransfer);
router.use('/deo/order', deoOrders);

//Cluster Routes
router.use('/cluster', clusterProfile);
router.use('/cluster/order', clusterOrder);
router.use('/cluster/users', clusterTchSch);

//School Routes
router.use('/school', schoolProfile);


router.use('/school', schoolRoutes);
router.use('/reports',reportRoutes)
//programmer routes
router.use('/programmer/profile',proProfile);
router.use('/programmer', proTchSch);

module.exports = router;