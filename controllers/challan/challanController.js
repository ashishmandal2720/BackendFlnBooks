// controllers/challanController.js
const axios = require('axios');
const challanModel = require('../../models/challanModel');

const fetchAndSaveChallans = async (req, res) => {
  try {
    const response = await axios.post('https://tbc.cg.nic.in/tbcapi2/api/tbc/getchallans');
    const challans = response.data?.ResponseData?.ChallanInfo;

    if (!challans || !Array.isArray(challans)) {
      return res.status(400).json({ message: 'Invalid response from API' });
    }

    for (const challan of challans) {
      await challanModel.insertChallanIfNotExists(challan);
    }

    return res.status(200).json({ message: 'Challans synced', count: challans.length });
  } catch (error) {
    console.error('Error syncing challans:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  fetchAndSaveChallans
};
