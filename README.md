# UPI Offline Mesh — MERN

A live simulation of **deferred UPI settlement through a Bluetooth-style mesh**. A sender encrypts a payment on their phone, nearby phones carry the ciphertext, and the first phone to reach 4G uploads it. The backend decrypts, checks freshness, and settles exactly once.

This is the MERN rebuild of the original Spring Boot demo. The Java implementation is preserved in [`java-reference/`](java-reference/) for comparison.

## Live demo

| Surface | URL |
|---|---|
| React control room | https://upi-without-internet-two.vercel.app |
| Express API | https://upi-mesh-api-knu5.onrender.com/api/health |

## What works

- **Hybrid encryption.** A fresh AES-256-GCM key encrypts each payment instruction; RSA-2048-OAEP wraps only that key. The wire format is `encrypted key + IV + ciphertext + GCM tag`.
- **Mesh simulation.** Five virtual phones: four offline relays and one 4G bridge. Gossip copies packets between phones, decrementing TTL at each hop.
- **Idempotent settlement.** The SHA-256 hash of the base64 ciphertext is the idempotency key. The ledger enforces it with a unique index.
- **Duplicate storm test.** Four bridges upload the same packet at once; only one debit lands.
- **Tamper test.** One flipped ciphertext byte fails GCM authentication and never reaches the ledger.
- **Replay test.** The second delivery of the same ciphertext is dropped.
- **Real ledger.** Accounts, transactions, and settlement state are stored in MongoDB Atlas.
- **Reset.** Restores the four seeded balances, clears the ledger, and empties the mesh.

## Architecture

```
web/                React + Vite frontend
  src/
    pages/          Control room, ledger, how it works
    components/     Mesh topology, event feed
    useMesh.js      API state and demo actions

api/                Express + MongoDB API
  src/
    crypto.js       RSA-OAEP + AES-256-GCM
    mesh.js         Virtual phone gossip simulator
    ledger.js       Idempotent ingestion and settlement
    routes.js       REST surface
    models.js       Account and Transaction schemas

java-reference/     Original Spring Boot + H2 implementation
```

## Demo accounts

| VPA | Holder | Seeded balance |
|---|---|---|
| `alice@demo` | Alice | ₹5,000 |
| `bob@demo` | Bob | ₹1,000 |
| `carol@demo` | Carol | ₹2,500 |
| `dave@demo` | Dave | ₹500 |

The demo PIN is any 4+ digits; it is hashed into the instruction but not checked against a real bank.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check with MongoDB readiness |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 contract |
| `GET` | `/api/server-key` | RSA public key and scheme metadata |
| `GET` | `/api/accounts` | Demo balances |
| `GET` | `/api/transactions` | Latest ledger rows |
| `POST` | `/api/demo/send` | Encrypt a packet and inject it |
| `POST` | `/api/demo/tamper` | Corrupt a packet and ingest it |
| `POST` | `/api/demo/replay` | Ingest the same packet twice |
| `POST` | `/api/demo/duplicate-storm` | Four concurrent uploads of one packet |
| `POST` | `/api/demo/reset` | Reset balances, ledger, and mesh (operator token) |
| `GET` | `/api/mesh/state` | Device packet counts and claims |
| `POST` | `/api/mesh/gossip` | One gossip round |
| `POST` | `/api/mesh/flush` | Upload every online bridge packet |
| `POST` | `/api/mesh/reset` | Clear the mesh (operator token) |
| `POST` | `/api/bridge/ingest` | Production-shaped bridge endpoint |

## Operator gate and API contract

Destructive demo actions (`/api/demo/reset`, `/api/mesh/reset`) require the
`x-demo-admin-token` header. The default demo value is `demo-operator-key`; set
`ADMIN_TOKEN` on Render to override it. This is a demo gate, not production auth.
The public lab actions are rate-limited.

The full API contract is served at `/api/openapi.json`. Request IDs are returned in
the `x-request-id` header, and the API writes one structured JSON log line per request.

## Run locally

```bash
npm run install:all

# API (port 4100)
# api/.env: MONGODB_URI=...
npm run dev:api

# Web (port 5175, proxies /api to 4100)
npm run dev:web
```

Or run the API from `api/`:

```bash
npm run dev
```

## Tests

```bash
npm test
```

Nine API tests cover health and MongoDB readiness, seeding, settlement, duplicate storms, replay, tamper rejection, insufficient funds, operator-token gating, payload validation, and reset.

## Deployment

- **Frontend:** Vercel static deployment, proxying `/api` to the Render API.
- **API:** Render web service from `api/`; a production-style `Dockerfile` is included.
- **Database:** MongoDB Atlas database `upimesh` on the existing `Cluster0`.
- **CI:** GitHub Actions runs API tests and the frontend build on every push.

## Honest limitations

- The receiver cannot verify that the sender has funds offline. The payment is an IOU until settlement.
- A malicious sender can attempt an offline double-spend. Whichever packet reaches the backend first settles; the other is rejected.
- The mesh is simulated in software. Real background BLE behavior is much harder.
- The RSA private key is generated per process. Production needs an HSM or KMS.
- This is not connected to NPCI or a real bank core.

The cryptography and idempotency code are production-shaped; the surrounding infrastructure is deliberately demo-sized.
