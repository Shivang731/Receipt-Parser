import { FormEvent, useState } from "react";
import type { Receipt } from "./App";

type UploadViewProps = {
  onReceipt: (receipt: Receipt) => void;
};

export default function UploadView({ onReceipt }: UploadViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a JPG or PNG receipt first.");
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://127.0.0.1:4000/api/receipts/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      onReceipt(data as Receipt);
    } catch {
      setError("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel" aria-live="polite">
      <p className="eyebrow">Receipt Parser</p>
      <h1>Upload receipt</h1>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Receipt image</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </section>
  );
}
