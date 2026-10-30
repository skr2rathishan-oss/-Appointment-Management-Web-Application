// Runs before each test file is loaded, i.e. before src/config/env.js reads process.env.
// Every variable env.js reads is set here, so nothing comes from the developer's server/.env
// (dotenv never overrides variables that already exist). No test talks to a real database:
// repositories and config/db.js are mocked in each test file.
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '0',
  CORS_ORIGIN: 'http://localhost:5173',
  CLINIC_TZ: 'UTC',
  DB_HOST: 'db.invalid',
  DB_PORT: '3306',
  DB_USER: 'test-user',
  DB_PASSWORD: 'test-password',
  DB_NAME: 'test-db',
  JWT_SECRET: 'test-jwt-secret-not-for-production',
  JWT_EXPIRES_IN: '1h',
  // Point dotenv at a file that doesn't exist, as a second guard
  DOTENV_CONFIG_PATH: './tests/.env.does-not-exist',
  DOTENV_PATH: './tests/.env.does-not-exist',
});
