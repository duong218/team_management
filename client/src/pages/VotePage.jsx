import { useState } from "react";
import { Vote, Check, Lock, Users, Flag } from "lucide-react";
import { useAsync, useTasks, useProject } from "../hooks";
import { listCurrentMembers } from "../api/members";
import * as voteApi from "../api/votes";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import Avatar from "../components/common/Avatar";
import { vnDue } from "../lib/format";
import "../styles/vote.css";

const unassigned = (t) => t.trang_thai === "can_lam" && !(t.assignees || []).some((a) => a.trang_thai === "dang_lam");

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
  if (loads.some((q) => q.loading && !q.data)) return <Skeleton />;
  const err = loads.find((q) => q.error)?.error;
  if (err) return <ErrorBox message={err} onRetry={() => Promise.all(loads.map((q) => q.reload()))} />;
  const pr = project.data?.project;
  if (!pr?.bat_binh_chon) return <EmptyState title="Bình chọn đang tắt">Nhóm trưởng hoặc phó nhóm chưa bật bình chọn nhận task.</EmptyState>;
  const closed = !!ended.data || pr.trang_thai !== "dang_hoat_dong";
  const picked = new Set((mine.data || []).map((r) => r.task_id));
  const total = members.data?.length || 0;
  const votersOf = (id) => (all.data || []).filter((v) => v.task_id === id);
  const list = (tasks.data || []).filter(unassigned);
  if (manager) list.sort((a, b) => votersOf(b.id).length - votersOf(a.id).length);
  const photo = new Map((members.data || []).map((m) => [m.member_id, m.anh_dai_dien])), voted = new Set((all.data || []).map((v) => v.member_id)).size;

  async function run(key, fn) {
    setBusy(key); setError("");
    try { await fn(); await Promise.all([mine.reload(), ended.reload(), all.reload()]); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); setConfirmEnd(false); }
  }
  const toggle = (id) => run(id, () => (picked.has(id) ? voteApi.removeVote(id) : voteApi.castVote(id)));

  return (
    <div className="vt">
      <header className="vt-head card">
        <span className="vt-ico"><Vote size={22} aria-hidden="true" /></span>
        <div className="vt-title">
          <h1>Bình chọn task</h1>
          <p>{closed ? "Đã kết thúc lựa chọn. Nhóm trưởng hoặc phó nhóm sẽ giao việc dựa trên kết quả." : "Chọn các task bạn muốn nhận. Được chọn nhiều task, nhóm trưởng hoặc phó nhóm quyết định giao cuối cùng."}</p>
        </div>
        <span className={`vt-state ${closed ? "is-closed" : "is-open"}`}>{closed ? <Lock size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}{closed ? "Đã kết thúc" : "Đang mở"}</span>
        {manager && <span className="vt-state"><Users size={14} aria-hidden="true" />{voted}/{total} bạn đã chọn</span>}
        {manager && !closed && (confirmEnd
          ? <span className="vt-confirm"><button type="button" className="vt-end" disabled={!!busy} onClick={() => run("end", () => voteApi.endVoting(projectId))}>Xác nhận kết thúc</button><button type="button" onClick={() => setConfirmEnd(false)}>Hủy</button></span>
          : <button type="button" className="vt-end" onClick={() => setConfirmEnd(true)}><Flag size={16} aria-hidden="true" />Kết thúc lựa chọn</button>)}
      </header>
      {error && <p className="vt-error" role="alert">{error}</p>}
      {!list.length ? <EmptyState title="Chưa có task để bình chọn">Chỉ task chưa giao ở cột Cần làm mới xuất hiện ở đây.</EmptyState> : (
        <ul className="vt-list">
          {list.map((t) => {
            const who = votersOf(t.id), pct = total ? Math.round((who.length / total) * 100) : 0, on = picked.has(t.id);
            return (
              <li key={t.id} className={`vt-item card${on ? " is-on" : ""}`}>
                <button type="button" className="vt-pick" role="checkbox" aria-checked={on} aria-label={`${on ? "Bỏ chọn" : "Chọn"} task ${t.tieu_de}`} disabled={closed || !!busy} onClick={() => toggle(t.id)}><Check size={16} strokeWidth={3} aria-hidden="true" /></button>
                <div className="vt-body">
                  <h2>{t.tieu_de}</h2>
                  {t.han_chot && <small>Hạn {vnDue(t.han_chot, false)}</small>}
                </div>
                {manager && (
                  <div className="vt-res">
                    <div className="vt-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% thành viên chọn`}><span style={{ width: `${pct}%` }} /></div>
                    <b>{pct}%</b>
                    <small>{who.length}/{total} bạn</small>
                    {who.length > 0 && <span className="vt-who">{who.slice(0, 4).map((v) => <Avatar key={v.member_id} name={v.ho_ten} src={photo.get(v.member_id)} size="sm" />)}<em>{who.map((v) => v.ho_ten).join(", ")}</em></span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}