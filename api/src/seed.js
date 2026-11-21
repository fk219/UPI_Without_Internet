import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { listAccounts, seedAccounts } from './ledger.js';

await connectDb(config.mongoUri);
await seedAccounts();
const accounts = await listAccounts();
await disconnectDb();
console.log(JSON.stringify({ seeded: accounts.length, accounts }, null, 2));
