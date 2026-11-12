import { useState } from "react";
import { validateHttps } from "../../lib/validators";
export default function LinkForm({ onSubmit }) {
  const [url, setUrl] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateHttps(url))
          return setError("Chỉ chấp nhận link HTTPS tối đa 2000 ký tự.");
        setError("");
        onSubmit?.({ url, ghi_chu: note });
      }}
    >
      <label>
        Link HTTPS
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          maxLength={2000}
        />
      </label>
      <label>
        Ghi chú
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button>Thêm minh chứng</button>
    </form>
  );
}
