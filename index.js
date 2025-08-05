#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const IpusnasDownloader = require("./IpusnasDownloader");

const args = process.argv.slice(2);
const tokenPath = path.join(__dirname, "token.json");

function showHelp() {
  console.log(`
📚 iPusnas Downloader CLI

Usage:
  node index.js --login <email> <password>    Log in and save token
  node index.js --list                        Download the book direct from your books shelf

Notes:
  - You must log in first before downloading any book.
  - The token will be saved to token.json in the current directory.
`);
}

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  showHelp();
  process.exit(0);
}

if (args[0] === "--login") {
  const email = args[1];
  const password = args[2];

  if (!email || !password) {
    console.error("❌ Usage: node index.js --login <email> <password>");
    process.exit(1);
  }

  const book = new IpusnasDownloader(null);
  book
    .login(email, password)
    .then((res) => {
      if (res) console.log("✅ Login successful. Token saved to token.json");
    })
    .catch((err) => {
      console.error("❌ Login failed:", err.message);
      process.exit(1);
    });

  return;
}

if (args[0] === "--list") {
  if (!fs.existsSync(tokenPath)) {
    console.error("❌ Token not found. Please login first.");
    process.exit(1);
  }

  const {
    data: { access_token },
  } = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

  const book = new IpusnasDownloader(null);
  book.listBorrowedBooks(access_token).then(async (selectedBookId) => {
    if (!selectedBookId) {
      console.log("❌ No book selected.");
      process.exit(1);
    }

    const selected = new IpusnasDownloader(selectedBookId);
    await selected.run();
  });

  return;
}
