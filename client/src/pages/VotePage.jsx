import { useState } from "react";
import { Vote, Check, Lock, Users, Flag, CalendarClock, CircleAlert, Inbox, HandHeart, LockKeyhole, Crown, UserPlus, MoonStar, TriangleAlert } from "lucide-react";
import { useAsync, useTasks, useProject } from "../hooks";
import { listCurrentMembers } from "../api/members";
import * as voteApi from "../api/votes";
import { ErrorBox } from "../components/common";
import Avatar from "../components/common/Avatar";
import { vnDue } from "../lib/format";
import "../styles/vote.css";

const unassigned = (t) => t.trang_thai === "can_lam" && !(t.assignees || []).some((a) => a.trang_thai === "dang_lam");

// Màu thanh theo hạng: 1 tím, 2 xanh ngọc, 3 san hô, còn lại xám. Màu luôn đi kèm số phần trăm bằng chữ.
const TONES = [
  { c: "#6E5CF2", glow: "rgba(110,92,242,.5)", knob: "#B6A9FF" },
  { c: "#19A7B8", glow: "rgba(25,167,184,.5)", knob: "#8FE3EA" },
  { c: "#F0795A", glow: "rgba(240,121,90,.5)", knob: "#FFC1AE" },
];
const GRAY = { c: "#8A8EAE", glow: "rgba(0,0,0,0)", knob: "#fff" };

// Hình động vật chỉ để trang trí (public/mascots/*.webp) nên alt rỗng.
const Sticker = ({ name, className }) => <img className={className} src={`/mascots/${name}.webp`} alt="" decoding="async" draggable="false" />;
const Spark = ({ className }) => (
  <svg className={`vt-spark ${className}`} viewBox="0 0 24 24"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" /></svg>
);
const Deco = () => (
  <div className="vt-deco" aria-hidden="true">
    <div className="vt-cloud c1"><i /><i /><i /><i /></div>
    <div className="vt-cloud c2"><i /><i /><i /><i /></div>
    <div className="vt-cloud c3"><i /><i /><i /><i /></div>
    <Spark className="s1" /><Spark className="s2" /><Spark className="s3" /><Spark className="s4" />
  </div>
);
const Wave = () => (
  <svg className="vt-wave" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="vt-rb" x1="0" x2="1">
        <stop offset="0" stopColor="#FF8FB8" /><stop offset=".25" stopColor="#FFB45C" /><stop offset=".5" stopColor="#FFD84D" /><stop offset=".75" stopColor="#6FD6A5" /><stop offset="1" stopColor="#7CB8FF" />
      </linearGradient>
    </defs>
    <path d="M3 8 Q 28 0 52 8 T 100 8 T 148 8 T 196 8 T 244 8 T 297 8" fill="none" stroke="url(#vt-rb)" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export default function VotePage({ projectId }) {
  const tasks = useTasks(projectId), project = useProject(projectId);
  const members = useAsync(() => listCurrentMembers(projectId), [projectId]);
  const ended = useAsync(() => voteApi.voteEnded(projectId), [projectId]);
  const mine = useAsync(() => voteApi.myVotes(projectId), [projectId]);
  const manager = ["truong_nhom", "pho_nhom"].includes(project.data?.vaiTro);
  // chỉ nhóm trưởng/phó đọc được ai chọn gì; thành viên thường thì hàm này bị chặn nên không gọi
  const all = useAsync(() => (manager ? voteApi.listVotes(projectId) : Promise.resolve([])), [projectId, manager]);
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [confirmEnd, setConfirmEnd] = useState(false);
  const loads = [tasks, project, members, ended, mine, all];
  if (loads.some((q) => q.loading && !q.data))
    return (
      <div className="vt">
        <Deco />
        <div className="vt-sks" role="status" aria-label="Đang tải bình chọn"><div className="vt-sk" /><div className="vt-sk" /><div className="vt-sk" /></div>
      </div>
    );
  const err = loads.find((q) => q.error)?.error;
  if (err) return <ErrorBox message={err} onRetry={() => Promise.all(loads.map((q) => q.reload()))} />;
  const pr = project.data?.project;
  if (!pr?.bat_binh_chon)
    return (
      <div className="vt">
        <Deco />
        <div className="vt-empty">
          <Sticker name="bear" className="vt-empty-art" />
          <div><h2>Bình chọn đang tắt</h2><p>Nhóm trưởng hoặc phó nhóm chưa bật bình chọn nhận task.</p></div>
        </div>
      </div>
    );
  const closed = !!ended.data || pr.trang_thai !== "dang_hoat_dong";
  const picked = new Set((mine.data || []).map((r) => r.task_id));
  const total = members.data?.length || 0;
  const votersOf = (id) => (all.data || []).filter((v) => v.task_id === id);
  const list = (tasks.data || []).filter(unassigned);
  if (manager) list.sort((a, b) => votersOf(b.id).length - votersOf(a.id).length);
  const myCount = list.filter((t) => picked.has(t.id)).length; // chỉ đếm task đang hiện trong danh sách (phiếu cũ của task đã giao không tính)
  const photo = new Map((members.data || []).map((m) => [m.member_id, m.anh_dai_dien])), votedIds = new Set((all.data || []).map((v) => v.member_id)), voted = votedIds.size;
  const notVoted = (members.data || []).filter((m) => !votedIds.has(m.member_id));

  async function run(key, fn) {
    setBusy(key); setError("");
    try { await fn(); await Promise.all([mine.reload(), ended.reload(), all.reload()]); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); setConfirmEnd(false); }
  }
  const toggle = (id) => run(id, () => (picked.has(id) ? voteApi.removeVote(id) : voteApi.castVote(id)));

  return (
    <div className="vt">
      <Deco />
      <header className="vt-head">
        <span className="vt-ico"><Vote size={30} aria-hidden="true" /></span>
        <div className="vt-title">
          <h1>Bình chọn task<Wave /></h1>
          <p>{closed ? "Đã kết thúc lựa chọn. Nhóm trưởng hoặc phó nhóm sẽ giao việc dựa trên kết quả." : "Chọn các task bạn muốn nhận. Được chọn nhiều task, nhóm trưởng hoặc phó nhóm quyết định giao cuối cùng."}</p>
        </div>
        <div className="vt-side">
          <div className="vt-chips">
            <span className={`vt-state ${closed ? "is-closed" : "is-open"}`}>{closed ? <Lock size={15} aria-hidden="true" /> : <Check size={15} strokeWidth={3} aria-hidden="true" />}{closed ? "Đã kết thúc" : "Đang mở"}</span>
            {manager
              ? <span className="vt-state is-count"><Users size={15} aria-hidden="true" />{voted}/{total} bạn đã chọn</span>
              : <span className="vt-state is-count"><HandHeart size={15} aria-hidden="true" />{myCount ? `Bạn đã chọn ${myCount} task` : "Bạn chưa chọn task nào"}</span>}
          </div>
          {manager && total > 0 && (
            <div className="vt-part">
              <span className="vt-stack">
                {(members.data || []).slice(0, 8).map((m) => (
                  <span key={m.member_id} className={`vt-pav${votedIds.has(m.member_id) ? "" : " is-no"}`} title={`${m.ho_ten}${votedIds.has(m.member_id) ? ", đã chọn" : ", chưa chọn"}`}>
                    <Avatar name={m.ho_ten} src={photo.get(m.member_id)} size="sm" />
                    {votedIds.has(m.member_id) && <span className="vt-ok"><Check size={11} strokeWidth={3.4} aria-hidden="true" /></span>}
                  </span>
                ))}
              </span>
              <span className="vt-partx">{notVoted.length ? `Chưa chọn: ${notVoted.slice(0, 2).map((m) => m.ho_ten).join(", ")}${notVoted.length > 2 ? ` và ${notVoted.length - 2} bạn khác` : ""}` : "Cả nhóm đã chọn xong"}</span>
            </div>
          )}
          {manager && !closed && !confirmEnd && (
            <button type="button" className="vt-end" onClick={() => setConfirmEnd(true)}><Flag size={17} aria-hidden="true" />Kết thúc lựa chọn</button>
          )}
        </div>
        {manager && !closed && confirmEnd && (
          <div className="vt-confirm" role="alertdialog" aria-label="Xác nhận kết thúc lựa chọn">
            <span className="vt-confirm-ico"><TriangleAlert size={22} aria-hidden="true" /></span>
            <div>
              <b>Kết thúc lựa chọn?</b>
              <p>Sau khi kết thúc, không ai chọn hay bỏ chọn được nữa. Nhóm trưởng và phó vẫn xem được kết quả để giao việc.</p>
              <div className="vt-confirm-act">
                <button type="button" className="vt-end" disabled={!!busy} onClick={() => run("end", () => voteApi.endVoting(projectId))}>Xác nhận kết thúc</button>
                <button type="button" className="vt-ghost" onClick={() => setConfirmEnd(false)}>Hủy</button>
              </div>
            </div>
          </div>
        )}
      </header>
      {error && <p className="vt-error" role="alert"><CircleAlert size={20} aria-hidden="true" />{error}</p>}
      {!list.length ? (
        <div className="vt-empty">
          <span className="vt-ico big"><Inbox size={44} aria-hidden="true" /></span>
          <div><h2>Chưa có task để bình chọn</h2><p>Chỉ task chưa giao ở cột Cần làm mới xuất hiện ở đây.</p></div>
        </div>
      ) : (
        <ul className={`vt-list${manager ? "" : " is-member"}${closed ? " is-closed" : ""}`}>
          {list.map((t, i) => {
            const who = votersOf(t.id), pct = total ? Math.round((who.length / total) * 100) : 0, on = picked.has(t.id);
            const tone = manager && who.length ? TONES[i] || GRAY : GRAY, w = Math.max(pct, 4);
            return (
              <li key={t.id} className={`vt-item${on ? " is-on" : ""}`} style={{ "--i": i, "--tc": tone.c, "--tg": tone.glow, "--tk": tone.knob }}>
                {manager && <span className={`vt-rank r${i < 3 ? i + 1 : 0}`} aria-label={`Hạng ${i + 1}`}>{i + 1}</span>}
                {manager && i === 0 && who.length > 0 && <span className="vt-ribbon"><Crown size={15} aria-hidden="true" />Được chọn nhiều nhất</span>}
                <button type="button" className={`vt-pick${closed && !on ? " is-lock" : ""}`} role="checkbox" aria-checked={on} aria-label={`${on ? "Bỏ chọn" : "Chọn"} task ${t.tieu_de}`} disabled={closed || !!busy} onClick={() => toggle(t.id)}>
                  {closed && !on ? <Lock size={20} aria-hidden="true" /> : <Check size={26} strokeWidth={3.4} aria-hidden="true" />}
                </button>
                <div className="vt-body">
                  <h2>{t.tieu_de}</h2>
                  {t.han_chot && <small><CalendarClock size={16} aria-hidden="true" />Hạn {vnDue(t.han_chot, false)}</small>}
                </div>
                {manager ? (
                  <div className="vt-res">
                    <div className="vt-resrow">
                      <div className="vt-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% thành viên chọn`}>
                        {pct > 0 && <><span className="vt-fill" style={{ width: `${w}%` }} /><i className="vt-knob" style={{ left: `${w}%` }} /></>}
                      </div>
                      <b className="vt-pct">{pct}%</b>
                      <small>{who.length}/{total} bạn</small>
                    </div>
                    <div className="vt-who">
                      {who.length > 0 ? (
                        <>
                          <span className="vt-stack">{who.slice(0, 4).map((v) => <Avatar key={v.member_id} name={v.ho_ten} src={photo.get(v.member_id)} size="sm" />)}</span>
                          <em>{who.map((v) => v.ho_ten).join(", ")}</em>
                          {closed && <a className="vt-give" href={`#/task/${t.id}`}><UserPlus size={16} aria-hidden="true" />Giao việc</a>}
                        </>
                      ) : (
                        <em className="vt-none"><MoonStar size={16} aria-hidden="true" />Chưa ai chọn task này</em>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className={`vt-mark${on ? " is-on" : ""}`}>{on && <Check size={15} strokeWidth={3} aria-hidden="true" />}{on ? "Đã chọn" : "Chưa chọn"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {manager ? (
        <div className="vt-mascots" aria-hidden="true"><Sticker name="cat" /><Sticker name="rabbit" /><Sticker name="bear" /></div>
      ) : (
        <div className="vt-foot">
          <Sticker name="cat" className="vt-foot-cat" />
          <span className="vt-ico small"><LockKeyhole size={22} aria-hidden="true" /></span>
          <div>
            <b>{closed ? "Bình chọn đã kết thúc" : "Lựa chọn của bạn được lưu ngay khi bấm"}</b>
            <small>Chỉ nhóm trưởng và nhóm phó thấy ai chọn task nào.</small>
          </div>
          {!closed && <span className="vt-state">Bạn có thể đổi ý đến khi bình chọn kết thúc</span>}
        </div>
      )}
    </div>
  );
}