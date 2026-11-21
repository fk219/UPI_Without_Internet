import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    vpa: { type: String, required: true, unique: true, trim: true },
    holderName: { type: String, required: true, trim: true },
    balancePaise: { type: Number, required: true, min: 0 },
    version: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const transactionSchema = new mongoose.Schema(
  {
    packetHash: { type: String, required: true, unique: true, index: true },
    senderVpa: { type: String, required: true },
    receiverVpa: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    signedAt: { type: Date, required: true },
    settledAt: { type: Date, default: null },
    bridgeNodeId: { type: String, default: 'unknown' },
    hopCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    reason: { type: String, default: null }
  },
  { timestamps: true }
);

transactionSchema.index({ createdAt: -1 });

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export const SEED_ACCOUNTS = [
  { vpa: 'alice@demo', holderName: 'Alice', balancePaise: 500000 },
  { vpa: 'bob@demo', holderName: 'Bob', balancePaise: 100000 },
  { vpa: 'carol@demo', holderName: 'Carol', balancePaise: 250000 },
  { vpa: 'dave@demo', holderName: 'Dave', balancePaise: 50000 }
];
