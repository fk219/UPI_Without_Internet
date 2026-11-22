export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'UPI Offline Mesh API',
    version: '1.0.0',
    description:
      'Encrypted packet ingestion and idempotent deferred settlement for the UPI mesh demo. The operator token gates reset actions only; the demo lab actions are public and rate-limited.'
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'demo' }, { name: 'mesh' }, { name: 'ledger' }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health and MongoDB readiness',
        responses: { 200: { description: 'API and database ready' }, 503: { description: 'Database unavailable' } }
      }
    },
    '/api/server-key': {
      get: {
        summary: 'RSA public key and scheme metadata',
        responses: { 200: { description: 'Public key metadata' } }
      }
    },
    '/api/accounts': {
      get: {
        summary: 'Seeded demo balances',
        responses: { 200: { description: 'Account list' } }
      }
    },
    '/api/transactions': {
      get: {
        summary: 'Latest ledger rows',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 } }],
        responses: { 200: { description: 'Transaction list' } }
      }
    },
    '/api/demo/send': {
      post: {
        tags: ['demo'],
        summary: 'Encrypt a payment and inject it into the mesh',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DemoSend' } } }
        },
        responses: {
          200: { description: 'Packet sealed and injected' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limited' }
        }
      }
    },
    '/api/demo/tamper': {
      post: { tags: ['demo'], summary: 'Corrupt a packet and ingest it', responses: { 200: { description: 'INVALID decryption_failed' } } }
    },
    '/api/demo/replay': {
      post: { tags: ['demo'], summary: 'Deliver the same packet twice', responses: { 200: { description: 'SETTLED then DUPLICATE_DROPPED' } } }
    },
    '/api/demo/duplicate-storm': {
      post: { tags: ['demo'], summary: 'Four concurrent uploads of one packet', responses: { 200: { description: 'One settlement, duplicates dropped' } } }
    },
    '/api/demo/reset': {
      post: {
        tags: ['demo'],
        summary: 'Reset balances, ledger, and mesh',
        security: [{ DemoOperator: [] }],
        responses: { 200: { description: 'Demo reset' }, 401: { description: 'Operator token required' } }
      }
    },
    '/api/mesh/state': {
      get: { tags: ['mesh'], summary: 'Device packet counts and claims', responses: { 200: { description: 'Mesh state' } } }
    },
    '/api/mesh/gossip': {
      post: { tags: ['mesh'], summary: 'One gossip round', responses: { 200: { description: 'Transfers and device counts' } } }
    },
    '/api/mesh/flush': {
      post: { tags: ['mesh'], summary: 'Upload every online bridge packet', responses: { 200: { description: 'Ingest outcomes' } } }
    },
    '/api/mesh/reset': {
      post: {
        tags: ['mesh'],
        summary: 'Clear the mesh',
        security: [{ DemoOperator: [] }],
        responses: { 200: { description: 'Mesh cleared' }, 401: { description: 'Operator token required' } }
      }
    },
    '/api/bridge/ingest': {
      post: {
        tags: ['ledger'],
        summary: 'Production-shaped bridge ingestion endpoint',
        parameters: [
          { name: 'x-bridge-node-id', in: 'header', schema: { type: 'string' } },
          { name: 'x-hop-count', in: 'header', schema: { type: 'integer', minimum: 0 } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MeshPacket' } } }
        },
        responses: { 200: { description: 'SETTLED, REJECTED, DUPLICATE_DROPPED, or INVALID' } }
      }
    }
  },
  components: {
    securitySchemes: {
      DemoOperator: { type: 'apiKey', in: 'header', name: 'x-demo-admin-token' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              requestId: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      },
      DemoSend: {
        type: 'object',
        required: ['senderVpa', 'receiverVpa', 'amount', 'pin'],
        properties: {
          senderVpa: { type: 'string', example: 'alice@demo' },
          receiverVpa: { type: 'string', example: 'bob@demo' },
          amount: { type: 'number', example: 150 },
          pin: { type: 'string', example: '1234' },
          ttl: { type: 'integer', minimum: 1, maximum: 8, example: 5 },
          startDevice: {
            type: 'string',
            enum: ['phone-alice', 'phone-stranger1', 'phone-stranger2', 'phone-stranger3', 'phone-bridge']
          }
        }
      },
      MeshPacket: {
        type: 'object',
        required: ['ciphertext'],
        properties: {
          packetId: { type: 'string' },
          ttl: { type: 'integer', minimum: 0, maximum: 8 },
          createdAt: { type: 'integer' },
          ciphertext: { type: 'string', description: 'base64 encrypted key + IV + ciphertext + GCM tag' }
        }
      },
      Account: {
        type: 'object',
        properties: {
          vpa: { type: 'string' },
          holderName: { type: 'string' },
          balancePaise: { type: 'integer' },
          balance: { type: 'string' }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          packetHash: { type: 'string' },
          senderVpa: { type: 'string' },
          receiverVpa: { type: 'string' },
          amount: { type: 'string' },
          status: { type: 'string', enum: ['SETTLED', 'REJECTED', 'PENDING'] },
          bridgeNodeId: { type: 'string' },
          hopCount: { type: 'integer' }
        }
      }
    }
  }
};
