# iPusnas Downloader

A modern, secure, and cross-platform toolkit to download and decrypt DRM-protected books from [iPusnas](https://ipusnas2.perpusnas.go.id/). Built for speed with **Bun** and **Hono**.

## ✨ Features

- **Smart Downloader**: Automatically decrypts and packages books into high-quality PDF or EPUB formats
- **Secure Token Storage**: Encrypted authentication tokens using AES-256-CBC
- **Rate Limiting**: Built-in protection against abuse (100 requests/minute)
- **Cross-Platform**: Works on Windows, Linux, and macOS
- **Real-time Progress**: SSE-based download progress without polling
- **Library Management**: View, open, and delete local books
- **Modern UI**: Catppuccin Mocha themed dashboard with accessibility support

## 🔒 Security Features

- Input validation with Zod schema
- Path traversal protection
- XSS sanitization in frontend
- CORS configuration
- Secure password handling (stdin pipe to QPDF)
- Encrypted token storage at rest

## 🚀 Quick Start

### Prerequisites

#### All Platforms

1. **Bun**: Install from [bun.sh](https://bun.sh/)

```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### QPDF Installation

**Windows:**

- Pre-bundled in `bin/qpdf.exe` (no action needed)

**Linux (Debian/Ubuntu):**

```bash
sudo apt update && sudo apt install qpdf
```

**Linux (Fedora):**

```bash
sudo dnf install qpdf
```

**Linux (Arch):**

```bash
sudo pacman -S qpdf
```

**macOS:**

```bash
brew install qpdf
```

### Installation

```bash
# Clone repository
git clone https://github.com/mysteriza/ipusnas-downloader.git
cd ipusnas-downloader

# Install dependencies
bun install
# or
npm install
```

### Running the App

```bash
# Development (hot reload)
bun run dev

# Production
bun run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Optional)

| Variable       | Description                                             | Default          |
| -------------- | ------------------------------------------------------- | ---------------- |
| `TOKEN_SECRET` | Encryption key for token storage (32 chars recommended) | Built-in default |

```bash
# Example
TOKEN_SECRET="your_secret_key_32_characters!!!" bun run dev
```

## 🛠 Tech Stack

| Component  | Technology                |
| ---------- | ------------------------- |
| Runtime    | [Bun](https://bun.sh/)    |
| Backend    | [Hono](https://hono.dev/) |
| Validation | [Zod](https://zod.dev/)   |
| Frontend   | Vanilla JS + CSS          |
| Styling    | Catppuccin Mocha Palette  |
| Decryption | QPDF                      |
| Archive    | AdmZip                    |

## 📁 Project Structure

```
ipusnas-downloader/
├── src/
│   ├── server.js       # Hono server with security middleware
│   ├── index.html      # Frontend with XSS protection
│   ├── styles.css      # External stylesheet (cached)
│   └── modules/
│       ├── api.js      # Axios wrapper
│       ├── auth.js     # Auth + encrypted token storage
│       ├── crypto.js   # DRM decryption with validation
│       ├── downloader.js # Cross-platform download/decrypt
│       └── processor.js  # Book processing orchestrator
├── bin/
│   └── qpdf.exe        # Windows QPDF binary
├── books/              # Downloaded books
├── temp/               # Temporary files
└── token.json          # Encrypted auth token
```

## 📋 API Endpoints

| Method | Endpoint                         | Description                  |
| ------ | -------------------------------- | ---------------------------- |
| POST   | `/api/login`                     | Authenticate user            |
| POST   | `/api/logout`                    | Clear session                |
| GET    | `/api/books`                     | List borrowed + local status |
| GET    | `/api/library`                   | List local books only        |
| POST   | `/api/download/:bookId`          | SSE stream download          |
| POST   | `/api/delete/:safeName`          | Delete local book            |
| POST   | `/api/open-folder/:safeName`     | Open folder in file manager  |
| GET    | `/api/files/:safeName/:filename` | Serve book file              |

## 🖥 Platform Support

| Platform | QPDF Source    | Folder Open Command |
| -------- | -------------- | ------------------- |
| Windows  | `bin/qpdf.exe` | `explorer`          |
| Linux    | System package | `xdg-open`          |
| macOS    | Homebrew       | `open`              |

## 📄 Credits

Originally inspired by the iPusnas CLI tool. Enhanced for the modern web with security hardening and cross-platform support.

---

_Disclaimer: This tool is for personal use only. Please respect copyright laws and the terms of service of iPusnas._
