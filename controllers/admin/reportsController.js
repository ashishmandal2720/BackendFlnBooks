const { page } = require('pdfkit');
const depotModel = require('../../models/reportsModel');

const getDepotList = async (req, res) => {
  try {
    const depots = await depotModel.getDepotList();
    res.status(200).json({
      success: true,
      message: 'Depot list fetched successfully',
      data: depots,
    });
  } catch (error) {
    console.error('Error fetching depot list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch depot list',
    });
  }
};

const getDepotDistrictList = async (req, res) => {
  try {
    const { depot_cd, division_id } = req.body;

    if (!depot_cd && !division_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either depot_cd or division_id',
      });
    }

    const districts = await depotModel.getDepotDistrictList({
      depot_cd: depot_cd ? parseInt(depot_cd) : null,
      division_id: division_id ? parseInt(division_id) : null,
    });

    res.status(200).json({
      success: true,
      message: 'District list fetched successfully',
      data: districts,
    });
  } catch (error) {
    console.error('Error fetching depot district list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch district list',
    });
  }
};

const getStudentBookDistributionReport = async (req, res) => {
  try {
    const filters = {
      division_id: req.body.division_id,
      depot_id: req.body.depot_id,
      district: req.body.district,
      block: req.body.block,
      cluster: req.body.cluster,
      school_type: req.body.filter,
    };

    const data = await depotModel.fetchStudentBookDistributionReport(filters);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const BookDistributionReportDetails = async (req, res) => {
  try {
    const filters = {
      division_id: req.body.division_id,
      depot_id: req.body.depot_id,
      district: req.body.district,
      block: req.body.block,
      cluster: req.body.cluster,
      school_type: req.body.filter,
      category:req.body.category,
      udise_code:req.body.udise_code,
      class_level: req.body.class_level,
      subject: req.body.subject,
      medium: req.body.medium,
      class_category: req.body.class_category,
    };
    
    const data = await depotModel.BookDistributionReportDetails(filters);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching report:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching report',
      error: error.message 
    });
  }
};
const SchoolListReport = async (req, res) => {
  try {
    const filters = {
      division_id: req.body.division_id,
      depot_id: req.body.depot_id,
      district_id: req.body.district,
      block_id: req.body.block,
      cluster_id: req.body.cluster,
      school_type: req.body.filter,
      category:req.body.category,
      udise_code:req.body.udise_code,
      class_level: req.body.class_level,
      subject: req.body.subject,
      medium: req.body.medium,
      page: req.body.page || 1,
      page_size: req.body.limit || 10,
    };
    
    const data = await depotModel.SchoolListReport(filters);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getCardCounts = async (req, res) => {
  try {
    const filters = {
      division_id: req.body.division_id,
      depot_id: req.body.depot_id,
      district: req.body.district,
      block: req.body.block,
      cluster: req.body.cluster,
      school_type: req.body.school_type,
    };

    const data = await depotModel.getCardCounts(filters);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const getSchoolScanningReportController = async (req, res) => {
  const { filter = 'district',category='all',type } = req.body;

  try {
    const reportData = await depotModel.getSchoolScanningReport(filter,category,type);
    res.status(200).json({success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDepotList,
  getDepotDistrictList,
  getStudentBookDistributionReport,
  getCardCounts,
  BookDistributionReportDetails,
  SchoolListReport,
  getSchoolScanningReportController
};

