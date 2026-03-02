// cron/challanJob.js
const cron = require('node-cron');
const axios = require('axios');
const {challanModel,migrateChallanData} = require('../../models/challanModel');

const fetchChallans = async () => {
  try {
    console.log("fetching challans");
    
    const response = await axios.post('https://tbc.cg.nic.in/tbcapi2/api/tbc/getchallans');
    const challans = response.data?.ResponseData?.ChallanInfo;

    if (!challans || !Array.isArray(challans)) {
      console.log('No valid challans received');
      return;
    }

    for (const challan of challans) {
      await challanModel.insertChallanIfNotExists(challan);
    }

    console.log(`[${new Date().toISOString()}] Synced ${challans.length} challans`);
  } catch (error) {
    console.error('Cron job failed:', error.message);
  }
};

cron.schedule('*/30 * * * *', async () => {
  try {
    await fetchChallans();
    await migrateChallanData();
    console.log('Challan fetch and migration completed');
  } catch (error) {
    console.error('Error in scheduled task:', error.message);
  }
});