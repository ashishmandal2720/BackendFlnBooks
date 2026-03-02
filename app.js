const express = require('express'), swaggerUi = require("swagger-ui-express");;
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB } = require('./config/db');
const morgan = require('morgan');
const { swaggerJson, swaggerOptions } = require('./config/swaggerConfig');
const { initializeDatabase } = require('./models');
const PORT = process.env.PORT || 5050;
// const HOST = process.env.HOST || 'http://localhost';

dotenv.config();
connectDB();
initializeDatabase();
const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.set('trust proxy', true)
app.use(express.static(__dirname))
app.use("/uploads", express.static("uploads"));
// Import routes
const statusRoutes = require('./routes/adminRoutes/statusRoutes');
const router = require('./routes/router');

// Enable CORS
// let corsOptions = {
//     origin: [`${HOST}:${PORT}`, `http://localhost:${PORT}`],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"], 
//     allowedHeaders: ["Content-Type", "Authorization"], 
//     exposedHeaders: ["Set-Cookie"]
// }

const allowedOrigins = [
  "http://localhost:5173/",
  "https://vsk.cg.gov.in/",
  "http://10.62.1.*:*/"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Set-Cookie"]
}));
app.options("*", cors());
// app.use(cors(corsOptions))
// app.options("*", cors(corsOptions));

// Define API routes
app.use('/api/v1', router);


app.use('/api/v1/test', statusRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerJson, swaggerOptions));

// app.listen(PORT, () => console.log(`🚀 Server running on  ${HOST}:${PORT}`));
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));


