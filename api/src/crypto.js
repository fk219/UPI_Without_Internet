import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes
} from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const RSA_ENCRYPTED_KEY_BYTES = 256;
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

export function publicKeyBase64() {
  return publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashCiphertext(base64Ciphertext) {
  return sha256Hex(base64Ciphertext);
}

export function encryptInstruction(instruction) {
  const aesKey = randomBytes(32);
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(instruction), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encryptedKey = publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  );
  return Buffer.concat([encryptedKey, iv, encrypted, tag]).toString('base64');
}

export function decryptInstruction(base64Ciphertext) {
  const all = Buffer.from(base64Ciphertext, 'base64');
  if (all.length < RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES + GCM_TAG_BYTES) {
    throw new Error('Ciphertext too short');
  }
  const encryptedKey = all.subarray(0, RSA_ENCRYPTED_KEY_BYTES);
  const iv = all.subarray(RSA_ENCRYPTED_KEY_BYTES, RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES);
  const tag = all.subarray(all.length - GCM_TAG_BYTES);
  const ciphertext = all.subarray(RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES, all.length - GCM_TAG_BYTES);
  const aesKey = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    encryptedKey
  );
  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
