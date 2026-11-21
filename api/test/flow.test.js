import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;
let app;
let db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  db = await import('../src/db.js');
  await db.connectDb(mongod.getUri('upimesh_test'));
  const { seedAccounts } = await import('../src/ledger.js');
  await seedAccounts({ force: true });
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

beforeEach(async () => {
  const { resetDemo } = await import('../src/ledger.js');
  await resetDemo();
});

afterAll(async () => {
  await db.disconnectDb();
  await mongod.stop();
});

describe('UPI mesh API', () => {
  it('serves health and seeded accounts', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const accounts = await request(app).get('/api/accounts');
    expect(accounts.status).toBe(200);
    expect(accounts.body.items).toHaveLength(4);
    expect(accounts.body.items.find((a) => a.vpa === 'alice@demo').balance).toBe('5000.00');
  });

  it('settles once after gossip and bridge flush', async () => {
    const send = await request(app)
      .post('/api/demo/send')
      .send({ senderVpa: 'alice@demo', receiverVpa: 'bob@demo', amount: 150, pin: '1234' });
    expect(send.status).toBe(200);

    await request(app).post('/api/mesh/gossip');
    await request(app).post('/api/mesh/gossip');
    const flush = await request(app).post('/api/mesh/flush');

    expect(flush.status).toBe(200);
    expect(flush.body.results.filter((r) => r.outcome === 'SETTLED')).toHaveLength(1);

    const accounts = await request(app).get('/api/accounts');
    expect(accounts.body.items.find((a) => a.vpa === 'alice@demo').balance).toBe('4850.00');
    expect(accounts.body.items.find((a) => a.vpa === 'bob@demo').balance).toBe('1150.00');

    const ledger = await request(app).get('/api/transactions');
    expect(ledger.body.items[0].status).toBe('SETTLED');
    expect(ledger.body.items[0].amount).toBe('150.00');
  });

  it('drops a duplicate storm after the first settlement', async () => {
    await request(app)
      .post('/api/demo/send')
      .send({ senderVpa: 'alice@demo', receiverVpa: 'bob@demo', amount: 20, pin: '1234' });
    await request(app).post('/api/mesh/gossip');
    await request(app).post('/api/mesh/gossip');

    const first = await request(app).post('/api/mesh/flush');
    expect(first.body.results.some((r) => r.outcome === 'SETTLED')).toBe(true);

    const second = await request(app).post('/api/mesh/flush');
    expect(second.body.results.every((r) => r.outcome === 'DUPLICATE_DROPPED')).toBe(true);

    const accounts = await request(app).get('/api/accounts');
    expect(accounts.body.items.find((a) => a.vpa === 'bob@demo').balance).toBe('1020.00');
  });

  it('rejects a replay of the same ciphertext', async () => {
    const replay = await request(app).post('/api/demo/replay').send({});
    expect(replay.status).toBe(200);
    expect(replay.body.first.outcome).toBe('SETTLED');
    expect(replay.body.second.outcome).toBe('DUPLICATE_DROPPED');
  });

  it('rejects a tampered ciphertext before settlement', async () => {
    const tamper = await request(app).post('/api/demo/tamper').send({});
    expect(tamper.status).toBe(200);
    expect(tamper.body.outcome).toBe('INVALID');
    expect(tamper.body.reason).toBe('decryption_failed');
  });

  it('rejects an unaffordable payment', async () => {
    await request(app)
      .post('/api/demo/send')
      .send({ senderVpa: 'dave@demo', receiverVpa: 'bob@demo', amount: 999, pin: '1234' });
    await request(app).post('/api/mesh/gossip');
    await request(app).post('/api/mesh/gossip');
    const flush = await request(app).post('/api/mesh/flush');

    expect(flush.body.results.some((r) => r.outcome === 'REJECTED')).toBe(true);
    const accounts = await request(app).get('/api/accounts');
    expect(accounts.body.items.find((a) => a.vpa === 'dave@demo').balance).toBe('500.00');
  });

  it('resets the demo ledger and mesh', async () => {
    await request(app)
      .post('/api/demo/send')
      .send({ senderVpa: 'alice@demo', receiverVpa: 'bob@demo', amount: 10, pin: '1234' });
    const reset = await request(app).post('/api/demo/reset').send({});
    expect(reset.status).toBe(200);

    const accounts = await request(app).get('/api/accounts');
    expect(accounts.body.items.find((a) => a.vpa === 'alice@demo').balance).toBe('5000.00');
    const ledger = await request(app).get('/api/transactions');
    expect(ledger.body.items).toHaveLength(0);
    const mesh = await request(app).get('/api/mesh/state');
    expect(mesh.body.devices.every((d) => d.packetCount === 0)).toBe(true);
  });
});
