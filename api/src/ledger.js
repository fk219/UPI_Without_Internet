import { hashCiphertext, decryptInstruction } from './crypto.js';
import { Account, Transaction, SEED_ACCOUNTS } from './models.js';
import { config } from './config.js';
import { mesh } from './mesh.js';

const claimedHashes = new Set();

export const serializeAccount = (account) => ({
  vpa: account.vpa,
  holderName: account.holderName,
  balancePaise: account.balancePaise,
  balance: (account.balancePaise / 100).toFixed(2),
  version: account.version
});

export const serializeTransaction = (tx) => ({
  id: tx._id.toString(),
  packetHash: tx.packetHash,
  packetHashShort: tx.packetHash.slice(0, 12),
  senderVpa: tx.senderVpa,
  receiverVpa: tx.receiverVpa,
  amountPaise: tx.amountPaise,
  amount: (tx.amountPaise / 100).toFixed(2),
  signedAt: tx.signedAt,
  settledAt: tx.settledAt,
  bridgeNodeId: tx.bridgeNodeId,
  hopCount: tx.hopCount,
  status: tx.status,
  reason: tx.reason
});

export async function seedAccounts({ force = false } = {}) {
  await Transaction.init();
  if (force) {
    await Account.deleteMany({});
    await Transaction.deleteMany({});
  }
  const count = await Account.countDocuments();
  if (count === 0) {
    await Account.insertMany(SEED_ACCOUNTS);
  }
}

export async function resetDemo() {
  mesh.reset();
  claimedHashes.clear();
  await Transaction.deleteMany({});
  await Account.deleteMany({});
  await Account.insertMany(SEED_ACCOUNTS);
}

export async function listAccounts() {
  const accounts = await Account.find({}).sort({ holderName: 1 }).lean();
  return accounts.map(serializeAccount);
}

export async function listTransactions(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const items = await Transaction.find({}).sort({ createdAt: -1 }).limit(safeLimit).lean();
  return items.map(serializeTransaction);
}

export function claimHash(packetHash) {
  if (claimedHashes.has(packetHash)) return false;
  claimedHashes.add(packetHash);
  return true;
}

export function idempotencyCacheSize() {
  return claimedHashes.size;
}

const invalid = (packetHash, reason) => ({ outcome: 'INVALID', packetHash, reason });
const duplicate = (packetHash) => ({ outcome: 'DUPLICATE_DROPPED', packetHash });

async function settle(instruction, packetHash, bridgeNodeId, hopCount) {
  const amountPaise = Number(instruction.amountPaise);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return invalid(packetHash, 'invalid_amount');
  }
  if (instruction.senderVpa === instruction.receiverVpa) {
    return invalid(packetHash, 'same_account');
  }

  let tx;
  try {
    tx = await Transaction.create({
      packetHash,
      senderVpa: instruction.senderVpa,
      receiverVpa: instruction.receiverVpa,
      amountPaise,
      signedAt: new Date(instruction.signedAt),
      bridgeNodeId,
      hopCount,
      status: 'PENDING'
    });
  } catch (error) {
    if (error?.code === 11000) return duplicate(packetHash);
    throw error;
  }

  const sender = await Account.findOneAndUpdate(
    { vpa: instruction.senderVpa, balancePaise: { $gte: amountPaise } },
    { $inc: { balancePaise: -amountPaise, version: 1 } },
    { new: true }
  );

  if (!sender) {
    tx.status = 'REJECTED';
    tx.reason = 'insufficient_funds';
    tx.settledAt = new Date();
    await tx.save();
    return {
      outcome: 'REJECTED',
      packetHash,
      reason: 'insufficient_funds',
      transactionId: tx._id.toString()
    };
  }

  const receiver = await Account.findOneAndUpdate(
    { vpa: instruction.receiverVpa },
    { $inc: { balancePaise: amountPaise, version: 1 } },
    { new: true }
  );

  if (!receiver) {
    await Account.updateOne(
      { vpa: instruction.senderVpa },
      { $inc: { balancePaise: amountPaise, version: 1 } }
    );
    tx.status = 'REJECTED';
    tx.reason = 'unknown_receiver';
    tx.settledAt = new Date();
    await tx.save();
    return {
      outcome: 'REJECTED',
      packetHash,
      reason: 'unknown_receiver',
      transactionId: tx._id.toString()
    };
  }

  tx.status = 'SETTLED';
  tx.settledAt = new Date();
  await tx.save();

  return {
    outcome: 'SETTLED',
    packetHash,
    transactionId: tx._id.toString(),
    transaction: serializeTransaction(tx)
  };
}

export async function ingestPacket(packet, bridgeNodeId = 'unknown', hopCount = 0) {
  if (!packet?.ciphertext) return invalid('?', 'missing_ciphertext');

  const packetHash = hashCiphertext(packet.ciphertext);
  if (!claimHash(packetHash)) return duplicate(packetHash);

  let instruction;
  try {
    instruction = decryptInstruction(packet.ciphertext);
  } catch {
    return invalid(packetHash, 'decryption_failed');
  }

  const ageSeconds = (Date.now() - Number(instruction.signedAt)) / 1000;
  if (!Number.isFinite(ageSeconds)) return invalid(packetHash, 'invalid_timestamp');
  if (ageSeconds > config.packetMaxAgeSeconds) return invalid(packetHash, 'stale_packet');
  if (ageSeconds < -300) return invalid(packetHash, 'future_dated');

  return settle(instruction, packetHash, bridgeNodeId, hopCount);
}
