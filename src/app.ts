import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { logger } from './utils/logger';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';

const app = express();

// Security & Headers
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.CORS_ORIGIN.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Parsers & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check at top-level
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'House of Seya Backend API', timestamp: new Date().toISOString() });
});

// Rate limiting
app.use('/api', apiRateLimiter);
app.use('/api/v1', apiRateLimiter);

// Static uploads serving for media assets
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Mount API routes (supports both /api and /api/v1)
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

// Global Error Handler
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 House of Seya Backend API server running on port ${PORT} [${env.NODE_ENV}]`);
    logger.info(`🌐 Health check available at http://localhost:${PORT}/api/health`);
  });
}

export default app;
