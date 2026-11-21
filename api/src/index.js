import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { seedAccounts } from './ledger.js';
import { createApp } from './app.js';

await connectDb(config.mongoUri);
await seedAccounts();

const app = createApp();
const server = app.listen(config.port, () => {
  process.stdout.write(`UPI mesh API listening on ${config.port}\n`);
});

const shutdown = async () => {
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
