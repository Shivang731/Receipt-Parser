import { useState } from "react";
import ResultView from "./ResultView";
import UploadView from "./UploadView";

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

export default function App() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  return (
    <main className="shell">
      {receipt ? <ResultView receipt={receipt} onBack={() => setReceipt(null)} /> : <UploadView onReceipt={setReceipt} />}
    </main>
  );
}
