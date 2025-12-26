const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequest } = require("./api");

const API_LOGIN = `https://api2-ipusnas.perpusnas.go.id/api/auth/login`;
const API_LIST_BORROW = `https://api2-ipusnas.perpusnas.go.id/api/webhook/book-borrow-shelf`;

const TOKEN_PATH = path.join(__dirname, "..", "..", "token.json");
const ENCRYPTION_KEY =
  process.env.TOKEN_SECRET || "ipusnas_default_key_32bytes!!!!";

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text) => {
  try {
    const parts = text.split(":");
    if (parts.length !== 2) return text;
    const iv = Buffer.from(parts[0], "hex");
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(parts[1], "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return text;
  }
};

const saveToken = (data) => {
  const encrypted = encrypt(JSON.stringify(data));
  fs.writeFileSync(TOKEN_PATH, encrypted);
};

const loadToken = () => {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const content = fs.readFileSync(TOKEN_PATH, "utf-8");
  try {
    const decrypted = decrypt(content);
    return JSON.parse(decrypted);
  } catch {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
};

const login = async (email, password) => {
  try {
    const client = createRequest();
    const { data } = await client.post(API_LOGIN, { email, password });
    saveToken(data);
    return data;
  } catch (err) {
    throw new Error(`Login failed: ${err.message}`);
  }
};

const listBorrowedBooks = async (token) => {
  try {
    const client = createRequest({
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await client.get(API_LIST_BORROW);
    return data.data || [];
  } catch (err) {
    throw new Error(`Failed to fetch borrowed books: ${err.message}`);
  }
};

module.exports = {
  login,
  listBorrowedBooks,
  loadToken,
  saveToken,
  TOKEN_PATH,
};
