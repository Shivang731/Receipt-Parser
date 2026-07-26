import { FormEvent, useState } from "react";
import type { Receipt } from "./App";

type ResultViewProps = {
  receipt: Receipt;
  onBack: () => void;
};

export default function ResultView({ receipt, onBack }: ResultViewProps) {
  const [draft, setDraft] = useState<Receipt>(receipt);
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof Receipt>(field: K, value: Receipt[K]) {
    setTouched(true);
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveMessage("");
  }

  function updateAmountField(field: "subtotal" | "tax" | "tip", value: string) {
    updateField(field, value === "" ? null : Number(value));
  }

  function updateLineItem(index: number, field: "name" | "amount", value: string) {
    setTouched(true);
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "amount" ? Number(value) : value }
          : item,
      ),
    }));
    setSaveMessage("");
  }

  function addLineItem() {
    setTouched(true);
    setDraft((current) => ({
      ...current,
      lineItems: [...current.lineItems, { name: "", amount: 0 }],
    }));
    setSaveMessage("");
  }

  function removeLineItem(index: number) {
    setTouched(true);
    setDraft((current) => ({
      ...current,
      lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSaveMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const response = await fetch("http://127.0.0.1:4000/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        setError("Save failed.");
        return;
      }

      setDraft(data.receipt as Receipt);
      setSaveMessage("Saved");
    } catch {
      setError("Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="result-layout">
      <div className="image-pane">
        <img
          src={`http://127.0.0.1:4000${draft.imagePath}`}
          alt="Uploaded receipt"
        />
      </div>

      <form className="panel receipt-form" onSubmit={handleSubmit}>
        <button className="back-button" type="button" onClick={onBack}>← Back</button>
        <p className="eyebrow">Extracted receipt</p>
        <h1>Review details</h1>

        {!touched && draft.total === 0 && draft.lineItems.length === 0 ? (
          <p className="warning">We couldn't read this receipt clearly. Please fill in the details manually.</p>
        ) : draft.mismatchFlag ? (
          <p className="warning">These numbers do not quite add up. Double-check the amounts.</p>
        ) : null}

        <label className="field">
          <span>Merchant</span>
          <input
            type="text"
            value={draft.merchant}
            onChange={(event) => updateField("merchant", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => updateField("date", event.target.value)}
          />
        </label>

        <fieldset className="line-items">
          <legend>Line items</legend>
          {draft.lineItems.map((item, index) => (
            <div className="line-item-row" key={index}>
              <label className="field compact-field">
                <span>Name</span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(event) => updateLineItem(index, "name", event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span>Amount</span>
                <input
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(event) => updateLineItem(index, "amount", event.target.value)}
                />
              </label>
              <button
                className="secondary-button remove-button"
                type="button"
                onClick={() => removeLineItem(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="secondary-button" type="button" onClick={addLineItem}>
            Add line item
          </button>
        </fieldset>

        <div className="totals-grid">
          <label className="field">
            <span>Subtotal</span>
            <input
              type="number"
              step="0.01"
              value={draft.subtotal ?? ""}
              onChange={(event) => updateAmountField("subtotal", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Tax</span>
            <input
              type="number"
              step="0.01"
              value={draft.tax ?? ""}
              onChange={(event) => updateAmountField("tax", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Tip</span>
            <input
              type="number"
              step="0.01"
              value={draft.tip ?? ""}
              onChange={(event) => updateAmountField("tip", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Total</span>
            <input
              type="number"
              step="0.01"
              value={draft.total}
              onChange={(event) => updateField("total", Number(event.target.value))}
            />
          </label>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {saveMessage ? <p className="success">{saveMessage}</p> : null}

        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save receipt"}
        </button>
      </form>
    </section>
  );
}
