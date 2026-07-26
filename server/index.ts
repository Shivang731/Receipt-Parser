import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
import express from "express";
import multer from "multer";
import { ReceiptExtractionError, extractReceiptFromImage } from "./gemini.js";
import { getImageExtension, saveReceipt, saveUploadedImage } from "./storage.js";
import { computeMismatch, type Receipt } from "./validate.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = "127.0.0.1";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/uploads", express.static("../uploads"));

app.post("/api/receipts", async (req, res) => {
  const receipt = req.body as Receipt;
  receipt.mismatchFlag = computeMismatch(receipt);

  await saveReceipt(receipt);
  res.json({ receipt });
});

app.post("/api/receipts/upload", (req, res) => {
  upload.single("image")(req, res, async (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File too large (max 10MB)" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Only JPG and PNG files are supported" });
      return;
    }

    const extension = getImageExtension(file.buffer);
    if (!extension) {
      res.status(400).json({ error: "Only JPG and PNG files are supported" });
      return;
    }

    const { imagePath, filePath } = await saveUploadedImage(file.buffer, extension);

    try {
      const extracted = await extractReceiptFromImage(filePath);
      const receipt: Receipt = {
        id: crypto.randomUUID(),
        merchant: extracted.merchant ?? "",
        date: extracted.date ?? "",
        lineItems: extracted.lineItems,
        subtotal: extracted.subtotal,
        tax: extracted.tax,
        tip: extracted.tip,
        total: extracted.total,
        imagePath,
      };

      receipt.mismatchFlag = computeMismatch(receipt);
      res.json(receipt);
      return;
    } catch (error) {
      if (!(error instanceof ReceiptExtractionError)) {
        throw error;
      }
    }

    const receipt: Receipt = {
      id: crypto.randomUUID(),
      merchant: "",
      date: "",
      lineItems: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: 0,
      imagePath,
    };
    receipt.mismatchFlag = computeMismatch(receipt);

    res.status(502).json({
      error: "Couldn't extract data from this receipt. Please enter details manually.",
      receipt,
    });
  });
});

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
