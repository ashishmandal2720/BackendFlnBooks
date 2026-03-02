const { createDatabaseIfNotExists } = require('./config/dbsetup');
(async () => {
  const dbReady = await createDatabaseIfNotExists();
  if (dbReady) {
    console.log("✅ Database is ready, starting the app...");
    require('./app'); 
  } else {
    console.log("❌ Failed to set up database. Exiting...");
    process.exit(1);
  }
})();