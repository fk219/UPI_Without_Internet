import { Router } from 'express';
import mongoose from 'mongoose';
import { publicKeyBase64 } from './crypto.js';
import { openapi } from './openapi.js';
import { demoLimiter, requireOperator, writeLimiter } from './security.js';
import { validate } from './validate.js';
import { bridgeIngestSchema, demoSendSchema } from './schemas.js';
import {
  duplicateStormDemo,
  replayDemoPacket,
  sendDemoPacket,
  tamperDemoPacket
} from './demo.js';
import {
  idempotencyCacheSize,
  ingestPacket,
  listAccounts,
  listTransactions,
  resetDemo
} from './ledger.js';
import { mesh } from './mesh.js';

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const router = Router();

router.get('/health', (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    ok: databaseReady,
    service: 'upi-mesh-api',
    database: databaseReady ? 'connected' : 'disconnected',
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    time: new Date().toISOString()
  });
});

router.get('/openapi.json', (_req, res) => {
  res.json(openapi);
});

router.get('/server-key', (_req, res) => {
  res.json({
    publicKey: publicKeyBase64(),
    algorithm: 'RSA-2048 / OAEP-SHA256',
    hybridScheme: 'RSA-OAEP encrypts an AES-256-GCM session key'
  });
});

router.post(
  '/demo/send',
  demoLimiter,
  validate(demoSendSchema),
  wrap(async (req, res) => {
    const result = sendDemoPacket(req.body);
    res.json(result);
  })
);

router.post(
  '/demo/tamper',
  wrap(async (_req, res) => {
    res.json(await tamperDemoPacket());
  })
);

router.post(
  '/demo/replay',
  wrap(async (_req, res) => {
    res.json(await replayDemoPacket());
  })
);

router.post(
  '/demo/duplicate-storm',
  wrap(async (_req, res) => {
    res.json(await duplicateStormDemo());
  })
);

router.post(
  '/demo/reset',
  requireOperator,
  writeLimiter,
  wrap(async (_req, res) => {
    await resetDemo();
    res.json({ ok: true, accounts: await listAccounts() });
  })
);

router.get(
  '/accounts',
  wrap(async (_req, res) => {
    res.json({ items: await listAccounts() });
  })
);

router.get(
  '/transactions',
  wrap(async (req, res) => {
    res.json({ items: await listTransactions(req.query.limit) });
  })
);

router.get('/mesh/state', (_req, res) => {
  res.json({
    devices: mesh.state(),
    idempotencyCacheSize: idempotencyCacheSize()
  });
});

router.post('/mesh/gossip', (_req, res) => {
  res.json(mesh.gossipOnce());
});

router.post(
  '/mesh/flush',
  demoLimiter,
  wrap(async (_req, res) => {
    const uploads = mesh.bridgeUploads();
    const results = await Promise.all(
      uploads.map(async (upload) => {
        const outcome = await ingestPacket(
          upload.packet,
          upload.bridgeNodeId,
          Math.max(0, 5 - upload.packet.ttl)
        );
        return {
          bridgeNode: upload.bridgeNodeId,
          packetId: upload.packet.packetId.slice(0, 8),
          ...outcome
        };
      })
    );
    res.json({ uploadsAttempted: uploads.length, results });
  })
);

router.post('/mesh/reset', requireOperator, writeLimiter, (_req, res) => {
  mesh.reset();
  res.json({ ok: true, status: 'mesh cleared' });
});

router.post(
  '/bridge/ingest',
  demoLimiter,
  validate(bridgeIngestSchema),
  wrap(async (req, res) => {
    const bridgeNodeId = req.get('x-bridge-node-id') || 'unknown';
    const hopCount = Number(req.get('x-hop-count') || 0);
    const result = await ingestPacket(req.body, bridgeNodeId, hopCount);
    res.json(result);
  })
);
