const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');

const app = express();
const appEnvironment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const allowedOriginPatterns = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(?::\d+)?$/i
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};

app.use(helmet());
app.use(compression());

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/announcements', require('./routes/announcements'));

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'CampusOS API',
    version: '1.0.0',
    environment: appEnvironment,
    status: 'online',
    health: '/health',
    resources: [
      '/api/auth',
      '/api/users',
      '/api/courses',
      '/api/exams',
      '/api/schedule',
      '/api/grades',
      '/api/assignments',
      '/api/attendance',
      '/api/announcements'
    ]
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CampusOS API',
    version: '1.0.0',
    environment: appEnvironment,
    status: 'online',
    api: '/api',
    health: '/health'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.statusCode || 500
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'CampusOS API route not found'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer(port = PORT) {
  try {
    await db.migrate();

    return await new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        const resolvedPort = server.address()?.port || port;
        console.log(`CampusOS API running on port ${resolvedPort}`);
        resolve(server);
      });

      server.on('error', reject);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
