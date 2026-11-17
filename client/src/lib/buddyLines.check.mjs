// Chạy: node src/lib/buddyLines.check.mjs — phải in "ok", sai thì ném lỗi.
import assert from "node:assert";
import { greetLine, inLunch } from "./buddyLines.js";
const at = (h, m = 0) => new Date(2026, 10, 17, h, m);
const first = () => 0; // luôn lấy câu đầu của khung
assert.match(greetLine(at(7), first), /buổi sáng/);
assert.match(greetLine(at(16, 29), first), /Chiều rồi/);
assert.match(greetLine(at(16, 30), first), /Hết giờ làm/);
assert.match(greetLine(at(23), first), /Khuya/);
assert.match(greetLine(at(2), first), /Khuya/);
assert.ok(inLunch(at(10, 30)) && inLunch(at(12, 59)) && !inLunch(at(13)) && !inLunch(at(10, 29)));
console.log("ok");
