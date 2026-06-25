require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes/index");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const app = express();
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' })); app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/pos', routes); app.use(notFound); app.use(errorHandler); module.exports = app;
