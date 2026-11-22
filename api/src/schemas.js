import { z } from 'zod';

export const demoSendSchema = z.object({
  senderVpa: z.string().min(1).max(64),
  receiverVpa: z.string().min(1).max(64),
  amount: z.coerce.number().positive().max(1_000_000),
  pin: z.string().min(4).max(12),
  ttl: z.coerce.number().int().min(1).max(8).optional(),
  startDevice: z
    .enum(['phone-alice', 'phone-stranger1', 'phone-stranger2', 'phone-stranger3', 'phone-bridge'])
    .optional()
});

export const bridgeIngestSchema = z.object({
  packetId: z.string().min(1).max(128).optional(),
  ttl: z.coerce.number().int().min(0).max(8).optional(),
  createdAt: z.coerce.number().optional(),
  ciphertext: z.string().min(20)
});

export const emptySchema = z.object({}).passthrough();
