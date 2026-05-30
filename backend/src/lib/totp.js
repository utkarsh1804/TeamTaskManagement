const crypto = require("crypto");

// RFC 6238 TOTP implemented with Node's built-in crypto (no external deps).

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buf) => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
};

const base32Decode = (str) => {
  const clean = String(str).toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const c of clean) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

const generateSecret = () => base32Encode(crypto.randomBytes(20));

const hotp = (secret, counter) => {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
};

const totp = (secret, t = Date.now()) => hotp(secret, Math.floor(t / 1000 / 30));

// Allows +/- one 30s window to tolerate clock drift.
const verify = (secret, token, window = 1) => {
  if (!secret || !/^\d{6}$/.test(String(token || ""))) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === String(token)) return true;
  }
  return false;
};

const otpauthURL = (secret, label, issuer = "TeamTask") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

module.exports = { generateSecret, totp, verify, otpauthURL };
