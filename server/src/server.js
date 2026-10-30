import app from './app.js';
import { env } from './config/env.js';
import { pool, pingDatabase } from './config/db.js';

const server = app.listen(env.port, async () => {
  console.log(`API listening on http://localhost:${env.port}/api`);
  try {
    await pingDatabase();
    console.log(`Connected to MySQL at ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (err) {
    console.error(`MySQL connection failed: ${err.message}`);
  }
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
