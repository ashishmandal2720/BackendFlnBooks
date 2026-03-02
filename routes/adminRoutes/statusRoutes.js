const express = require('express');
const router = express.Router();
const { checkDbStatus } = require('../../config/db'); // Import the function to check DB status

router.get('/status', (req, res) => {
  /* #swagger.tags = ['Status'] */
  res.json({ message: 'API is running', status: 'OK' });
});
router.get('/', async(req, res) => {
  /* #swagger.tags = ['Status'] */
  const dbStatus = await checkDbStatus(); // Call the function to check DB status
  const apiStatus = {
    status: 'OK',
    message: 'API is running'
  };

  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>System Status</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7fa;
          margin: 0;
          padding: 20px;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        .container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
        }
        .card {
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          padding: 20px;
          width: 300px;
          transition: transform 0.2s;
        }
        .card:hover {
          transform: scale(1.02);
        }
        .status-ok {
          color: green;
          font-weight: bold;
        }
        .status-error {
          color: red;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 0.9em;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>🚀 System Status Dashboard</h1>
      <div class="container">
        <div class="card">
          <h2>API Status</h2>
          <p>Status: <span class="status-ok">${apiStatus.status}</span></p>
          <p>Message: ${apiStatus.message}</p>
        </div>

        <div class="card">
          <h2>Database Status</h2>
          <p>Status: <span class="${dbStatus.status === 'OK' ? 'status-ok' : 'status-error'}">${dbStatus.status}</span></p>
          <p>Message: ${dbStatus.message}</p>
        </div>
      </div>

      <div class="footer">
        Uptime: ${process.uptime().toFixed(2)} seconds | Checked at: ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;

  res.set('Content-Type', 'text/html');
  res.send(htmlResponse);
});

module.exports = router;