const { Hono } = require("hono");
const { logger } = require("hono/logger");
const { streamSSE } = require("hono/streaming");
const { cors } = require("hono/cors");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const {
  login,
  listBorrowedBooks,
  loadToken,
  TOKEN_PATH,
} = require("./modules/auth");
const { processBook, getLocalBooks } = require("./modules/processor");
const { BOOKS_DIR } = require("./modules/downloader");

const app = new Hono();

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

const rateLimiter = async (c, next) => {
  const ip =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const now = Date.now();
  const windowData = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - windowData.start > RATE_LIMIT_WINDOW) {
    windowData.count = 1;
    windowData.start = now;
  } else {
    windowData.count++;
  }

  rateLimitMap.set(ip, windowData);

  if (windowData.count > RATE_LIMIT_MAX) {
    return c.json({ success: false, message: "Rate limit exceeded" }, 429);
  }

  await next();
};

const sanitizePath = (input) => {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
    .replace(/\.{2,}/g, "_")
    .substring(0, 255);
};

const getOpenFolderCommand = () => {
  const platform = process.platform;
  if (platform === "win32") return "explorer";
  if (platform === "darwin") return "open";
  return "xdg-open";
};

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("*", rateLimiter);

const htmlFile = Bun.file(path.join(__dirname, "index.html"));
const cssFile = Bun.file(path.join(__dirname, "styles.css"));

app.get("/", async (c) => {
  return c.html(await htmlFile.text());
});

app.get("/styles.css", async (c) => {
  return c.body(await cssFile.text(), 200, { "Content-Type": "text/css" });
});

app.post("/api/logout", async (c) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  return c.json({ success: true });
});

app.post("/api/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { success: false, message: "Invalid email or password format" },
        400
      );
    }

    const { email, password } = parsed.data;
    const data = await login(email, password);
    return c.json({ success: true, user: data.data });
  } catch (err) {
    return c.json({ success: false, message: err.message }, 401);
  }
});

app.get("/api/books", async (c) => {
  const tokenData = loadToken();
  if (!tokenData || !tokenData.data) {
    return c.json({ success: false, message: "Not authenticated" }, 401);
  }

  const { access_token } = tokenData.data;
  try {
    const remoteBooks = await listBorrowedBooks(access_token);
    const localBooks = getLocalBooks();

    const books = remoteBooks.map((rb) => {
      const normalize = (s) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]/gi, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");
      const rbSafe = normalize(rb.book_title);

      const localBook = localBooks.find((lb) => normalize(lb.id) === rbSafe);

      return {
        ...rb,
        isLocal: !!localBook,
        safeName: localBook
          ? localBook.id
          : rb.book_title
              .trim()
              .replace(/[^a-z0-9_\-\.]/gi, "_")
              .replace(/_+/g, "_"),
        localFilename: localBook ? localBook.filename : null,
        localFormat: localBook ? localBook.format : null,
      };
    });

    return c.json({ success: true, books });
  } catch (err) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

app.get("/api/library", async (c) => {
  try {
    const localBooks = getLocalBooks();
    return c.json({ success: true, books: localBooks });
  } catch (err) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

app.post("/api/download/:bookId", async (c) => {
  const bookId = c.req.param("bookId");

  if (!bookId || !/^[a-zA-Z0-9_\-]+$/.test(bookId)) {
    return c.json({ success: false, message: "Invalid book ID" }, 400);
  }

  return streamSSE(c, async (stream) => {
    try {
      const result = await processBook(bookId, async (data) => {
        await stream.writeSSE({
          data: JSON.stringify({ type: "progress", ...data }),
        });
      });
      await stream.writeSSE({
        data: JSON.stringify({ type: "complete", ...result }),
      });
    } catch (err) {
      await stream.writeSSE({
        data: JSON.stringify({ type: "error", message: err.message }),
      });
    }
  });
});

app.post("/api/delete/:safeName", async (c) => {
  const safeName = sanitizePath(c.req.param("safeName"));

  if (!safeName) {
    return c.json({ success: false, message: "Invalid folder name" }, 400);
  }

  const folderPath = path.join(BOOKS_DIR, safeName);
  const realPath = path.resolve(folderPath);

  if (!realPath.startsWith(path.resolve(BOOKS_DIR))) {
    return c.json({ success: false, message: "Access denied" }, 403);
  }

  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    return c.json({ success: true });
  }
  return c.json({ success: false, message: "Folder not found" }, 404);
});

app.post("/api/open-folder/:safeName", async (c) => {
  const safeName = sanitizePath(c.req.param("safeName"));

  if (!safeName) {
    return c.json({ success: false, message: "Invalid folder name" }, 400);
  }

  const folderPath = path.join(BOOKS_DIR, safeName);
  const realPath = path.resolve(folderPath);

  if (!realPath.startsWith(path.resolve(BOOKS_DIR))) {
    return c.json({ success: false, message: "Access denied" }, 403);
  }

  if (fs.existsSync(folderPath)) {
    const command = getOpenFolderCommand();
    Bun.spawn([command, folderPath]);
    return c.json({ success: true });
  }
  return c.json({ success: false, message: "Folder not found" }, 404);
});

app.get("/api/files/:safeName/:filename", async (c) => {
  const safeName = sanitizePath(c.req.param("safeName"));
  const filename = sanitizePath(c.req.param("filename"));

  if (!safeName || !filename) {
    return c.json({ success: false, message: "Invalid parameters" }, 400);
  }

  const filePath = path.join(BOOKS_DIR, safeName, filename);
  const realPath = path.resolve(filePath);

  if (!realPath.startsWith(path.resolve(BOOKS_DIR))) {
    return c.json({ success: false, message: "Access denied" }, 403);
  }

  if (fs.existsSync(filePath)) {
    const file = Bun.file(filePath);
    const contentType = filename.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "application/epub+zip";

    return new Response(file.stream(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Content-Length": String(file.size),
      },
    });
  }

  return c.json({ success: false, message: "File not found" }, 404);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
