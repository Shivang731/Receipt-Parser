import { readFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { type ExtractedReceipt, parseExtractedReceipt } from "./validate.js";

const MODEL = "gemini-flash-latest";
const ERROR_MESSAGE = "Couldn't extract data from this receipt. Please enter details manually.";

const ORIGINAL_PROMPT = `You are extracting structured data from a photo of a receipt.
Return ONLY valid JSON, no markdown formatting, no code fences, no explanation text.

Schema:
{
  "merchant": string,
  "date": string (format YYYY-MM-DD if determinable, otherwise the raw date text as printed),
  "lineItems": [{ "name": string, "amount": number }],
  "subtotal": number or null,
  "tax": number or null,
  "tip": number or null,
  "total": number
}

Rules:
- lineItems are ONLY purchased products/services. Do not include tax, tip, subtotal, discounts, or the total as line items.
- Do not include discounts anywhere in the output.
- If a field genuinely cannot be determined from the image, use null (except lineItems, which should be an empty array if none found, and total, which should be your best-effort number even if uncertain).
- Do not hallucinate values. If the image is not a receipt or is unreadable, return merchant: null, lineItems: [], total: 0.`;

const RETRY_PROMPT = `Your previous response was not valid JSON matching the required schema.
Return ONLY the JSON object, nothing else — no markdown, no commentary.

${ORIGINAL_PROMPT}`;

export class ReceiptExtractionError extends Error {
  constructor() {
    super(ERROR_MESSAGE);
  }
}

function mimeTypeForPath(filePath: string) {
  return path.extname(filePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
}

async function generateReceiptText(filePath: string, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment");
    throw new ReceiptExtractionError();
  }

  const ai = new GoogleGenAI({ apiKey });
  const image = await readFile(filePath);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType: mimeTypeForPath(filePath),
          data: image.toString("base64"),
        },
      },
      { text: prompt },
    ],
  });

  return response.text ?? "";
}

async function callGeminiWithNetworkRetry(filePath: string, prompt: string) {
  try {
    return await generateReceiptText(filePath, prompt);
  } catch (err) {
    console.error("Gemini call failed, retrying after 1s:", err);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return generateReceiptText(filePath, prompt);
  }
}

export async function extractReceiptFromImage(filePath: string) {
  let text: string;

  try {
    text = await callGeminiWithNetworkRetry(filePath, ORIGINAL_PROMPT);
  } catch (err) {
    console.error("Gemini retry exhausted:", err);
    throw new ReceiptExtractionError();
  }

  const firstResult = parseExtractedReceipt(text);
  if (firstResult) {
    return firstResult;
  }

  try {
    const retryText = await generateReceiptText(filePath, RETRY_PROMPT);
    const retryResult = parseExtractedReceipt(retryText);
    if (retryResult) {
      return retryResult;
    }
  } catch (err) {
    console.error("Gemini malformed-JSON retry failed:", err);
    throw new ReceiptExtractionError();
  }

  throw new ReceiptExtractionError();
}
