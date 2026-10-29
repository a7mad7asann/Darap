import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public';
process.env.APP_DATABASE_URL =
  process.env.APP_DATABASE_URL ||
  'postgresql://darb_app:darb_app_secret@localhost:5432/darb_dev?schema=public';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'super-secret-key-that-is-at-least-32-characters-long!';
process.env.PORT = '4000';
process.env.COOKIE_SECURE = 'false';
