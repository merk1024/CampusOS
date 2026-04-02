const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
require('dotenv').config();

const db = require('./config/database');

const app = express();
const appEnvironment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const appVersion = process.env.APP_VERSION || '1.0.0';
const appStartedAt = new Date();
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

app.use((req, res, next) => {
  const forwardedRequestId = String(req.headers['x-request-id'] || '').trim();
  req.requestId = forwardedRequestId || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

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

morgan.token('request-id', (req) => req.requestId || '-');
morgan.token('user-id', (req) => String(req.user?.id || 'guest'));

const accessLogFormat = process.env.NODE_ENV === 'development'
  ? 'dev'
  : ':date[iso] :request-id :method :url :status :res[content-length] - :response-time ms user=:user-id';

app.use(morgan(accessLogFormat, {
  skip: (req) => req.path === '/health'
}));

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
app.use('/api/integrations', require('./routes/integrations'));

const buildServiceStatusPayload = (requestId, status, details = {}) => ({
  service: 'CampusOS API',
  version: appVersion,
  environment: appEnvironment,
  status,
  timestamp: new Date().toISOString(),
  startedAt: appStartedAt.toISOString(),
  uptimeSeconds: Math.round(process.uptime()),
  requestId,
  ...details
});

const checkDatabaseReadiness = async () => {
  await db.get('SELECT 1 AS ready');
  return {
    client: db.client,
    status: 'ready'
  };
};

app.get('/health', (req, res) => {
  res.json({
    ...buildServiceStatusPayload(req.requestId, 'ok'),
    database: {
      client: db.client,
      status: 'configured'
    }
  });
});

app.get('/ready', async (req, res) => {
  try {
    const database = await checkDatabaseReadiness();

    res.json({
      ...buildServiceStatusPayload(req.requestId, 'ready'),
      database
    });
  } catch (error) {
    res.status(503).json({
      ...buildServiceStatusPayload(req.requestId, 'degraded'),
      database: {
        client: db.client,
        status: 'unavailable',
        error: 'Database connection failed'
      }
    });
  }
});

app.get('/api', (req, res) => {
  res.json({
    name: 'CampusOS API',
    version: appVersion,
    environment: appEnvironment,
    status: 'online',
    health: '/health',
    readiness: '/ready',
    resources: [
      '/api/auth',
      '/api/users',
      '/api/courses',
      '/api/exams',
      '/api/schedule',
      '/api/grades',
      '/api/assignments',
      '/api/attendance',
      '/api/announcements',
      '/api/integrations'
    ]
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CampusOS API',
    version: appVersion,
    environment: appEnvironment,
    status: 'online',
    api: '/api',
    health: '/health',
    readiness: '/ready'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.statusCode || 500,
      requestId: req.requestId
    },
    requestId: req.requestId
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'CampusOS API route not found',
    requestId: req.requestId
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
