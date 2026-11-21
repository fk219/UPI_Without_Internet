import { randomUUID } from 'node:crypto';
import { encryptInstruction, sha256Hex } from './crypto.js';
import { ingestPacket } from './ledger.js';
import { mesh } from './mesh.js';

const DEMO_DEVICES = new Set([
  'phone-alice',
  'phone-stranger1',
  'phone-stranger2',
  'phone-stranger3',
  'phone-bridge'
]);

function toPaise(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const paise = Math.round(numeric * 100);
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
}

export function createPacket({ senderVpa, receiverVpa, amount, pin, ttl = 5 }) {
  if (!senderVpa || !receiverVpa) throw new Error('Both sender and receiver are required');
  if (!pin || String(pin).length < 4) throw new Error('A 4+ digit demo PIN is required');
  const amountPaise = toPaise(amount);
  if (!amountPaise) throw new Error('Amount must be a positive number');

  const instruction = {
    senderVpa,
    receiverVpa,
    amountPaise,
    pinHash: sha256Hex(String(pin)),
    nonce: randomUUID(),
    signedAt: Date.now()
  };

  const packet = {
    packetId: randomUUID(),
    ttl: Math.min(Math.max(Number(ttl) || 5, 1), 8),
    createdAt: Date.now(),
    ciphertext: encryptInstruction(instruction)
  };

  return { packet, amountPaise };
}

export function sendDemoPacket({ senderVpa, receiverVpa, amount, pin, ttl = 5, startDevice = 'phone-alice' }) {
  if (!DEMO_DEVICES.has(startDevice)) throw new Error(`Unknown start device: ${startDevice}`);
  const { packet, amountPaise } = createPacket({ senderVpa, receiverVpa, amount, pin, ttl });
  mesh.inject(startDevice, packet);
  return {
    packetId: packet.packetId,
    packetIdShort: packet.packetId.slice(0, 8),
    ciphertextPreview: `${packet.ciphertext.slice(0, 64)}...`,
    ttl: packet.ttl,
    injectedAt: startDevice,
    amountPaise,
    amount: (amountPaise / 100).toFixed(2)
  };
}

export function tamperDemoPacket() {
  const { packet } = createPacket({
    senderVpa: 'alice@demo',
    receiverVpa: 'bob@demo',
    amount: 1,
    pin: '1234',
    ttl: 5
  });
  const bytes = Buffer.from(packet.ciphertext, 'base64');
  bytes[bytes.length - 1] ^= 0xff;
  const tampered = { ...packet, ciphertext: bytes.toString('base64') };
  return ingestPacket(tampered, 'tamper-lab', 0);
}

export async function replayDemoPacket() {
  const { packet } = createPacket({
    senderVpa: 'alice@demo',
    receiverVpa: 'bob@demo',
    amount: 1,
    pin: '1234',
    ttl: 5
  });
  const first = await ingestPacket(packet, 'replay-lab', 0);
  const second = await ingestPacket(packet, 'replay-lab', 0);
  return { first, second };
}

export async function duplicateStormDemo() {
  const { packet } = createPacket({
    senderVpa: 'alice@demo',
    receiverVpa: 'bob@demo',
    amount: 1,
    pin: '1234',
    ttl: 5
  });
  const results = await Promise.all(
    ['bridge-a', 'bridge-b', 'bridge-c', 'bridge-d'].map((bridge) =>
      ingestPacket(packet, bridge, 2)
    )
  );
  return { attempts: results.length, results };
}
