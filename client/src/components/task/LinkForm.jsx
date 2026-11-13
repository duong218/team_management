import { useState } from "react";
import { Link2 } from "lucide-react";
import { validateHttps } from "../../lib/validators";
export default function LinkForm({ onSubmit }) {
  const [url, setUrl] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="td-link-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validateHttps(url))
          return setError("Chỉ chấp nhận link HTTPS tối đa 2000 ký tự.");
        setError("");
        onSubmit?.({ url, ghi_chu: note });
      }}
    >
      <div className="td-link-form-head">
        <span aria-hidden="true"><Link2 size={17} /></span>
        <div><strong>Thêm minh chứng</strong><small>Dán đường dẫn HTTPS để xác nhận mục này đã hoàn thành.</small></div>
      </div>
      <label>
        Đường dẫn minh chứng
        <input
          type="url"
          inputMode="url"
          placeholder="https://ví-dụ.com/tài-liệu"
          autoComplete="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          maxLength={2000}
        />
      </label>
      <label>
        Ghi chú <span className="td-link-optional">(không bắt buộc)</span>
        <input placeholder="Ví dụ: bản thiết kế hoàn chỉnh" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="td-link-form-actions">
        <small>Chỉ chấp nhận link HTTPS</small>
        <button className="primary"><Link2 size={16} />Thêm minh chứng</button>
      </div>
    </form>
  );
}
