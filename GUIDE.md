# Mesh / UPI — Guide

## What it is

Mesh / UPI is a live simulation of offline payments with deferred settlement. A payment is encrypted on one phone, carried as ciphertext by other phones, and settled exactly once when any phone reaches a 4G bridge.

- **Live app:** https://meshpay.furqankhan.dev
- **API:** https://upi-mesh-api-knu5.onrender.com

This is a systems experiment, not a real UPI rail. No real money moves.

## How to use the control room

1. Open the control room.
2. Pick a sender and receiver from the four seeded accounts: `alice@demo`, `bob@demo`, `carol@demo`, and `dave@demo`.
3. Enter an amount and any 4+ digit demo PIN.
4. Press **Seal packet** to encrypt the instruction and inject it into the mesh.
5. Press **Gossip one round** to copy ciphertext between phones.
6. Press **Flush the bridges** to have 4G phones upload their copies.
7. Open **Ledger** to see settled and rejected transactions.

Use **Run the full route** to do seal, gossip, flush, and settlement in one action.

## Failure tests

- **Tamper test** flips one ciphertext byte. GCM authentication fails and the packet is rejected.
- **Replay test** delivers the same packet twice. The first settles; the second is dropped as a duplicate.
- **Duplicate storm** has four bridges upload at once. Only one debit lands.

**Reset demo** restores the seeded balances and clears the ledger and mesh.

## What the API does

- `GET /api/accounts` — seeded balances.
- `POST /api/demo/send` — encrypt and inject a payment.
- `POST /api/mesh/gossip` — move ciphertext between phones.
- `POST /api/mesh/flush` — upload copies from 4G bridges.
- `POST /api/demo/tamper`, `/replay`, `/duplicate-storm` — failure tests.
- `POST /api/demo/reset` — restore the demo.
- `GET /api/transactions` — settlement ledger.
- `GET /api/health` — database-aware health.

## Tech

React, Vite, Express, MongoDB Atlas, RSA-OAEP + AES-256-GCM, idempotency by ciphertext hash.

## Honest limits

- The receiver cannot verify offline funds. The payment is an IOU until settlement.
- A malicious sender can attempt an offline double-spend; settlement rejects the second claim.
- The mesh is simulated in software.
- The free Render API can cold-start after inactivity.
