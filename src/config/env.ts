import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  PORT: process.env.PORT || '4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'hos_access_secret_fallback',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'hos_refresh_secret_fallback',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  // Long-lived Instagram access token for @houseofseya.in (see .env.example)
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  // Public storefront origin; used for blog URLs in the generated sitemap
  SITE_URL: (process.env.SITE_URL || 'https://www.houseofseya.com').replace(/\/+$/, ''),
  PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL || 'http://localhost:4000/uploads',
};
