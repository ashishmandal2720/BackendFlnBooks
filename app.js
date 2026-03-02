const express = require('express');
const swaggerUi = require("swagger-ui-express");
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB } = require('./config/db');
const morgan = require('morgan');
const { swaggerJson, swaggerOptions } = require('./config/swaggerConfig');
const { initializeDatabase } = require('./models');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const compression = require('compression');
const { insertAllBookData } = require('./config/insertInto');
// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5051;

// Allowed Origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://vsk.cg.gov.in",
  "http://10.62.1.*:*"
];

// Master Process
// if (cluster.isMaster) {
//   console.log(` Master ${process.pid} is running at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

//   // Fork workers
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   // Restart dead worker
//   cluster.on('exit', (worker, code, signal) => {
//     console.log(` Worker ${worker.process.pid} died at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Restarting...`);
//     cluster.fork();
//   });

// } else {
  // Worker Process: Run app setup inside async function
  (async () => {
    try {
      await connectDB();
      await initializeDatabase();
     ////await insertAllBookData();////

      const app = express();

      // Middlewares
      app.use(express.json());
      app.use(morgan('dev'));
	  app.use(compression());
      app.set('trust proxy', true);
      app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
      app.use('/barcodes', express.static(path.join(__dirname, 'barcodes')));

      // Custom CORS Handling
      app.use(cors({
        origin: function (origin, callback) {
          if (
            !origin || // For tools like Postman or curl
            allowedOrigins.includes(origin) ||
            allowedOrigins.some(rule => rule instanceof RegExp ? rule.test(origin) : false)
          ) {
            callback(null, true);
          } else {
            callback(new Error('❌ Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Set-Cookie"]
      }));
      app.options("*", cors());

      // Routes
      const statusRoutes = require('./routes/adminRoutes/statusRoutes');
      const router = require('./routes/router');

      app.use('/api/v3', router);
      app.use('/api/v2/test', statusRoutes);
      app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerJson, swaggerOptions));

      // Start Server
      app.listen(PORT, () => {
        console.log(` Backend running on http://localhost:${PORT} by worker ${process.pid} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      });

    } catch (err) {
      console.error('❌ Failed to start server:', err);
      process.exit(1);
    }
  })();
//}
