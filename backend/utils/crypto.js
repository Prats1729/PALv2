const crypto = require("crypto");

const ALGORITHM_GCM = "aes-256-gcm";
const ALGORITHM_CBC = "aes-256-cbc";
const GCM_IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKeyBuffer() {
  const key = (process.env.ENCRYPTION_KEY || '').trim();
  if (!key || key.length !== 64) {
    throw new Error("ENCRYPTION_KEY environment variable must be a 64-character hexadecimal string.");
  }
  return Buffer.from(key, "hex");
}

function encrypt(text) {
  if (!text) return null;
  const keyBuffer = getKeyBuffer();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  if (!text) return null;
  const keyBuffer = getKeyBuffer();
  const textParts = text.split(":");

  // Authenticated GCM format: iv:authTag:ciphertext
  if (textParts.length === 3) {
    const iv = Buffer.from(textParts[0], "hex");
    const authTag = Buffer.from(textParts[1], "hex");
    const encryptedText = Buffer.from(textParts[2], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  }

  // Backward compatibility fallback for legacy CBC format: iv:ciphertext
  if (textParts.length === 2) {
    const iv = Buffer.from(textParts[0], "hex");
    const encryptedText = Buffer.from(textParts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  }

  throw new Error("Invalid encrypted text format");
}

module.exports = { encrypt, decrypt };
