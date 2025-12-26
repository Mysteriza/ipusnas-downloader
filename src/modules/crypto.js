const crypto = require("crypto");

const validateString = (value, name) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
};

const decryptKey = (userId, bookId, epustakaId, borrowKey) => {
  validateString(userId, "userId");
  validateString(bookId, "bookId");
  validateString(epustakaId, "epustakaId");
  validateString(borrowKey, "borrowKey");

  const formatted = `${userId}${bookId}${epustakaId}`;
  const key = crypto
    .createHash("sha256")
    .update(formatted)
    .digest("hex")
    .slice(7, 23);
  const iv = Buffer.from(borrowKey, "base64").slice(0, 16);
  const ciphertext = Buffer.from(borrowKey, "base64").slice(16);
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf-8");
};

const generatePasswordPDF = (decryptedKey) => {
  validateString(decryptedKey, "decryptedKey");
  const hash = crypto
    .createHash("sha384")
    .update(decryptedKey, "utf8")
    .digest("hex");
  return hash.slice(9, 73);
};

const generatePasswordZip = (decryptedKey, useSha512 = false) => {
  validateString(decryptedKey, "decryptedKey");
  const algorithm = useSha512 ? "sha512" : "sha1";
  const hash = crypto
    .createHash(algorithm)
    .update(decryptedKey, "utf-8")
    .digest("hex");
  return hash.slice(59, 105);
};

module.exports = {
  decryptKey,
  generatePasswordPDF,
  generatePasswordZip,
};
