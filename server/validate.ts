export type Receipt = {
  id: string;
  merchant: string;
  date: string;
  lineItems: { name: string; amount: number }[];
  subtotal?: number | null;
  tax?: number | null;
  tip?: number | null;
  total: number;
  imagePath: string;
  mismatchFlag?: boolean;
};

export type ExtractedReceipt = {
  merchant: string | null;
  date: string | null;
  lineItems: { name: string; amount: number }[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number;
};

export function parseExtractedReceipt(text: string): ExtractedReceipt | null {
  try {
    const parsed = JSON.parse(text) as Partial<ExtractedReceipt>;

    if (
      typeof parsed.total !== "number" ||
      !Array.isArray(parsed.lineItems) ||
      !parsed.lineItems.every(
        (item) =>
          item &&
          typeof item.name === "string" &&
          typeof item.amount === "number",
      )
    ) {
      return null;
    }

    return {
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      lineItems: parsed.lineItems,
      subtotal: parsed.subtotal ?? null,
      tax: parsed.tax ?? null,
      tip: parsed.tip ?? null,
      total: parsed.total,
    };
  } catch {
    return null;
  }
}

export function computeMismatch(r: Receipt): boolean {
  const lineSum = r.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const withoutTip = lineSum + (r.tax ?? 0);
  const withTip = withoutTip + (r.tip ?? 0);
  const matchesEitherFormula =
    Math.abs(withoutTip - r.total) <= 0.02 ||
    Math.abs(withTip - r.total) <= 0.02;
  return !matchesEitherFormula;
}
