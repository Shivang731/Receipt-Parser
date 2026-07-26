import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";
import type { Receipt } from "./validate.js";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(serverDir, "..", "uploads");
const receiptsPath = path.join(serverDir, "..", "receipts.json");

export function getImageExtension(buffer: Buffer): "jpg" | "png" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  return null;
}

export async function saveUploadedImage(buffer: Buffer, extension: "jpg" | "png") {
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${uuidv4()}.${extension}`;
  const imagePath = `/uploads/${filename}`;
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);

  return { imagePath, filePath };
}

export async function readReceipts() {
  try {
    return JSON.parse(await readFile(receiptsPath, "utf8")) as Receipt[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await writeFile(receiptsPath, "[]");
      return [];
    }

    throw error;
  }
}

export async function saveReceipt(receipt: Receipt) {
  const receipts = await readReceipts();
  const existingIndex = receipts.findIndex((saved) => saved.id === receipt.id);

  if (existingIndex === -1) {
    receipts.push(receipt);
  } else {
    receipts[existingIndex] = receipt;
  }

  await writeFile(receiptsPath, JSON.stringify(receipts, null, 2));
}
