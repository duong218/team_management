import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCorners, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Activity, AlarmClock, AlertTriangle, CalendarDays, CalendarRange, Check, ChevronDown, ChevronRight, Circle, CircleCheck, Clock3, Eye, Folder, FolderOpen, GripVertical, LayoutGrid, Link2, ListChecks, Loader, Plus, Search, Users, X } from "lucide-react";
import { STATE_ORDER, STATES } from "../../lib/constants";
import { isLateTask, vnDue, vnTime } from "../../lib/format";
import { useTask, useTaskComments } from "../../hooks";
import Avatar from "../common/Avatar";
import TaskCard from "./TaskCard";
import "../../styles/kanban.css";

const MOBILE = "(max-width: 760px)";
const subscribe = (callback) => { const media = matchMedia(MOBILE); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };
const useMobile = () => useSyncExternalStore(subscribe, () => matchMedia(MOBILE).matches, () => false);
const ICONS = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck };
const findDropTarget = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length ? underPointer : closestCorners(args);
};
const ACTIVITY_LABELS = { tao_task: "Đã tạo task", cap_nhat_task: "Đã cập nhật task", gan_task: "Đã giao task", bat_dau: "Đã bắt đầu thực hiện", them_muc: "Đã thêm mục checklist", sua_muc: "Đã sửa mục checklist", xoa_muc: "Đã xóa mục checklist", them_link: "Đã thêm minh chứng", xoa_link: "Đã xóa minh chứng", tick_muc: "Đã hoàn thành mục checklist", bo_tick_muc: "Đã bỏ tích mục checklist", gui_duyet: "Đã gửi duyệt", duyet_task: "Đã duyệt hoàn thành", tu_duyet: "Đã tự duyệt hoàn thành", tra_lai_task: "Đã trả task để chỉnh sửa", huy_task: "Đã hủy task", khoi_phuc_task: "Đã khôi phục task", them_binh_luan: "Đã thêm bình luận", sua_binh_luan: "Đã sửa bình luận", go_binh_luan: "Đã gỡ bình luận", xoa_binh_luan: "Đã xóa bình luận", xin_chuyen_giao: "Đã xin chuyển giao", chuyen_giao: "Đã chuyển giao task" };
const activityLabel = (action = "") => ACTIVITY_LABELS[action.split(":")[0]] || "Task đã được cập nhật";

function Column({ state, tasks, onCreateTask, readOnly, mobile, filtered, selectedId, canOpen, onSelect, isMine }) {
  const { setNodeRef, isOver } = useDroppable({ id: state, disabled: readOnly });
  const Icon = ICONS[state];
  return <section ref={setNodeRef} className="kb-lane" data-state={state} data-over={isOver || undefined} aria-label={STATES[state]}>
    <header className="kb-lane-head"><span className="kb-ico"><Icon size={18} /></span><h2>{STATES[state]}</h2><b className="kb-lane-count">{tasks.length}</b>{state === "can_lam" && onCreateTask && <button className="kb-add-task" type="button" onClick={onCreateTask} aria-label="Tạo task"><Plus size={19} /></button>}</header>
    <div className="kb-column-scroll">{tasks.map((task) => <DragCard key={task.id} task={task} selected={selectedId === task.id} onSelect={onSelect} locked={canOpen ? !canOpen(task) : false} readOnly={readOnly} mobile={mobile} mine={isMine(task)} />)}
      {!tasks.length && state === "can_lam" && onCreateTask ? <button type="button" className="kb-empty-create" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "8px" }} onClick={onCreateTask}><span><Plus size={27} /></span><strong style={{ display: "block", width: "100%" }}>Tạo task</strong><small style={{ display: "block", width: "100%" }}>Thêm công việc mới</small></button> : !tasks.length && <p className="kb-empty">{readOnly ? "Không có task" : filtered ? "Không có task phù hợp" : mobile ? "Chưa có task ở cột này" : "Kéo task vào đây"}</p>}
    </div>
  </section>;
}

function DragCard({ task, selected, onSelect, locked, readOnly, mobile, mine }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: readOnly });
  return <div ref={setNodeRef} className="kb-card-wrap" data-selected={selected || undefined} style={{ transform: isDragging ? undefined : CSS.Transform.toString(transform), opacity: isDragging ? 0.25 : 1 }}>
    <div {...(!readOnly && !mobile ? { ...attributes, ...listeners, "aria-label": "Kéo thẻ" } : {})}>
      <TaskCard task={task} onOpen={onSelect} locked={locked} mine={mine} />
    </div>
    {!readOnly && mobile && <button ref={setActivatorNodeRef} type="button" className="kb-drag-handle" {...attributes} {...listeners} aria-label={`Kéo task ${task.tieu_de || "không tên"}`}><GripVertical size={18} /></button>}
  </div>;
}

function Preview({ task, onOpen, onClear, canOpen }) {
  const allowed = task && (!canOpen || canOpen(task));
  const detail = useTask(allowed ? task?.id : null);
  const comments = useTaskComments(allowed ? task?.id : null);
  const [tab, setTab] = useState("detail"), [showAllItems, setShowAllItems] = useState(false), [showAllLinks, setShowAllLinks] = useState(false);
  const full = detail.data?.id === task?.id ? detail.data : task;
  const assignments = full?.assignees || [];
  const activeAssignees = assignments.filter((item) => item.trang_thai === "dang_lam" && item.member?.trang_thai === "dang_tham_gia");
  const missingDueToKick = ["can_lam", "dang_lam"].includes(full?.trang_thai) && assignments.some((item) => item.member?.trang_thai === "da_roi" && item.member?.ly_do_roi === "bi_loai");
  const people = activeAssignees.map((item) => item.member);
  const items = (full?.checklist || []).filter((item) => item.trang_thai_muc === "da_duyet");
  const completed = items.filter((item) => item.da_xong).length;
  const links = (full?.links || []).filter((item) => item.trang_thai_link === "hop_le");
  const commentRows = comments.data?.taskId === task?.id ? comments.data.rows : [];
  const activity = full?.activity || [];
  const taskLinks = items.flatMap((item) => links.filter((link) => link.muc_id === item.id).map((link) => ({ ...link, itemName: item.noi_dung })));
  const previewItems = showAllItems ? items : items.slice(0, 3);
  const previewLinks = showAllLinks ? taskLinks : taskLinks.slice(0, 3);
  useEffect(() => { setTab("detail"); setShowAllItems(false); setShowAllLinks(false); }, [task?.id]);
  return <aside className="kb-preview" aria-label="Xem nhanh task">
    {!task ? <div className="kb-preview-empty"><Activity size={25} /><strong>Chọn một task</strong><span>Thông tin chi tiết sẽ hiện ở đây.</span></div> : !allowed ? <div className="kb-preview-empty"><strong>Task bị giới hạn xem</strong><span>Bạn chỉ xem được task được giao cho mình.</span></div> : <>
      <div className="kb-preview-top"><span className="kb-state-chip" data-state={task.trang_thai}>{STATES[task.trang_thai]}</span><div className="kb-preview-actions"><button type="button" className="kb-preview-close" onClick={onClear} aria-label="Bỏ chọn task"><X size={18} /></button></div></div>
      <div className="kb-preview-scroll">
      <h2>{full.tieu_de || "Task"}</h2>
      <div className="kb-preview-tabs" role="tablist" aria-label="Thông tin task">
        <button type="button" role="tab" aria-selected={tab === "detail"} onClick={() => setTab("detail")}>Chi tiết</button>
        <button type="button" role="tab" aria-selected={tab === "comments"} onClick={() => setTab("comments")}>Bình luận <b>{comments.loading ? "…" : commentRows.length}</b></button>
        <button type="button" role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")}>Hoạt động</button>
      </div>
      {tab === "detail" && detail.error && <p className="kb-preview-error" role="alert">{detail.error}<button type="button" onClick={detail.reload}>Thử lại</button></p>}
      {tab === "detail" ? <div className="kb-preview-content">
        {missingDueToKick && <p className="kb-preview-vacancy"><AlertTriangle size={15} aria-hidden="true" />Task thiếu người được giao vì thành viên đã bị kick.</p>}
        <p className="kb-preview-description">{full.mo_ta || "Chưa có mô tả cho công việc này."}</p>
        <dl className="kb-preview-meta"><div><dt>Người làm</dt><dd>{people.length ? activeAssignees.map(({ member, member_id }) => <span className="kb-person" key={member_id}><Avatar name={member.ho_ten} src={member.anh_dai_dien} size="sm" />{member.ho_ten}</span>) : "Chưa giao"}</dd></div>
          <div><dt>Hạn chót</dt><dd>{full.han_chot ? <><CalendarDays size={16} />{vnDue(full.han_chot)}</> : "Chưa đặt hạn"}{isLateTask(full) && <span className="kb-preview-late"><AlarmClock size={14} />Quá hạn</span>}</dd></div>
        </dl>
        <div className="kb-preview-progress"><div><strong>Tiến độ</strong><b>{Math.min(100, Math.max(0, Number(full.tien_do) || 0))}%</b></div><span><i style={{ width: `${Math.min(100, Math.max(0, Number(full.tien_do) || 0))}%` }} /></span></div>
        <section className="kb-preview-section"><header><h3><ListChecks size={16} />Việc nhỏ</h3><b>{completed}/{items.length}</b></header>{detail.loading && <small className="kb-preview-muted">Đang tải checklist…</small>}{previewItems.map((item) => <div className={`kb-preview-check${item.da_xong ? " is-done" : ""}`} key={item.id}><span>{item.da_xong && <Check size={13} />}</span><p>{item.noi_dung}</p></div>)}{items.length > 3 && <button className="kb-preview-more" type="button" onClick={() => setShowAllItems((value) => !value)}>{showAllItems ? "Thu gọn" : `Xem thêm ${items.length - 3} việc nhỏ`}<ChevronDown size={14} /></button>}</section>
        <section className="kb-preview-section"><header><h3><Link2 size={16} />Link minh chứng</h3><b>{taskLinks.length}</b></header>{previewLinks.map((link) => <a className="kb-preview-link" key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"><span><strong>{link.ghi_chu || link.itemName || "Minh chứng"}</strong><small>{link.url}</small></span><Link2 size={15} /></a>)}{taskLinks.length > 3 && <button className="kb-preview-more" type="button" onClick={() => setShowAllLinks((value) => !value)}>{showAllLinks ? "Thu gọn" : `Xem thêm ${taskLinks.length - 3} link`}<ChevronDown size={14} /></button>}{!detail.loading && !taskLinks.length && <small className="kb-preview-muted">Chưa có link minh chứng.</small>}</section>
      </div> : tab === "comments" ? <div className="kb-preview-content kb-preview-feed">{comments.error ? <p className="kb-preview-error" role="alert">{comments.error}<button type="button" onClick={comments.reload}>Thử lại</button></p> : comments.loading ? <p className="kb-preview-muted">Đang tải bình luận…</p> : commentRows.length ? commentRows.slice(-5).reverse().map((comment) => <article className={`kb-preview-comment${comment.go_luc ? " is-withdrawn" : ""}`} key={comment.id}><div><Avatar name={comment.ho_ten} src={comment.anh_dai_dien} size="sm" /><strong>{comment.ho_ten || "Thành viên"}</strong><time>{vnTime(comment.tao_luc)}</time></div><p>{comment.go_luc ? `Đã gỡ bình luận${comment.go_ten ? ` · ${comment.go_ten}` : ""}` : comment.noi_dung}</p></article>) : <p className="kb-preview-muted">Chưa có bình luận.</p>}</div> : <div className="kb-preview-content kb-preview-feed">{detail.error ? <p className="kb-preview-error" role="alert">{detail.error}<button type="button" onClick={detail.reload}>Thử lại</button></p> : detail.loading ? <p className="kb-preview-muted">Đang tải hoạt động…</p> : activity.length ? activity.slice(-6).reverse().map((event) => <article className="kb-preview-event" key={event.id}><span><Clock3 size={14} /></span><div><strong>{activityLabel(event.hanh_dong)}</strong><time>{vnTime(event.thoi_gian)}</time></div></article>) : <p className="kb-preview-muted">Chưa có hoạt động để hiển thị.</p>}</div>}
      </div>
      <button className="kb-preview-open" type="button" onClick={() => onOpen(task.id)}>Mở chi tiết đầy đủ <span>→</span></button>
    </>}
  </aside>;
}

export default function KanbanBoard({ tasks = [], members = [], projectName = "Công việc", onMove, onOpen, onCreateTask, canOpen, meId, readOnly = false }) {
  const mobile = useMobile(), pager = useRef(null);
  const [column, setColumn] = useState(STATE_ORDER[0]), [filter, setFilter] = useState("all"), [mode, setMode] = useState("board"), [density, setDensity] = useState("vua"), [search, setSearch] = useState(""), [selectedId, setSelectedId] = useState(() => tasks.find((task) => !canOpen || canOpen(task))?.id || null), [draggedTask, setDraggedTask] = useState(null);
  const isMine = (task) => !!meId && (task.assignees || []).some((person) => person.member_id === meId);
  const counts = useMemo(() => Object.fromEntries(STATE_ORDER.map((state) => [state, tasks.filter((task) => task.trang_thai === state).length])), [tasks]);
  const done = counts.hoan_thanh, total = tasks.length, late = tasks.filter(isLateTask).length, active = members.filter((member) => member.trang_thai === "dang_tham_gia").length;
  const selected = tasks.find((task) => task.id === selectedId) || null;
  const visible = useMemo(() => tasks.filter((task) => {
    const mine = !!meId && (task.assignees || []).some((person) => person.member_id === meId);
    const matchesFilter = filter === "all" || (filter === "mine" ? mine : isLateTask(task));
    const q = search.trim().toLocaleLowerCase("vi");
    const matchesSearch = !q || [task.tieu_de, task.mo_ta, ...(task.assignees || []).map((person) => person.member?.ho_ten)].filter(Boolean).join(" ").toLocaleLowerCase("vi").includes(q);
    return matchesFilter && matchesSearch;
    }), [tasks, filter, search, meId]);
  const mineCount = tasks.filter(isMine).length;
  function scrollColumn(state) {
    setColumn(state);
    if (mobile && pager.current) pager.current.scrollTo({ left: STATE_ORDER.indexOf(state) * pager.current.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function syncColumn(event) {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    const next = STATE_ORDER[index] || STATE_ORDER[0];
    setColumn((current) => current === next ? current : next);
  }
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const setSelection = (id) => setSelectedId((current) => current === id ? current : id);
  const lane = (state) => visible.filter((task) => task.trang_thai === state);

  return <div className={`kb-board-layout${mode === "people" ? " is-people" : ""}`} data-density={density}>
    <div className="kb-board-main">
    <section className="kb-overview" aria-label="Tổng quan công việc">
      <article className="kb-project-tile"><img className="kb-project-mascot" src="/jumping-polar-bear.svg" alt="" aria-hidden="true" /><span className="kb-project-monogram">{projectName.trim().charAt(0).toLocaleUpperCase("vi") || "D"}</span><div><h1>{projectName}</h1><p>{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "long" }).format(new Date())} · {total} task · {active} thành viên</p></div></article>
      <div className="kb-stats-strip" aria-label="Số liệu công việc">
        <div className="kb-stat" data-tone="mint"><span className="kb-mini-ring" style={{ "--progress": `${total ? (done / total) * 100 : 0}%` }} /><div><strong>{total ? Math.round((done / total) * 100) : 0}%</strong><small>Hoàn thành {done}/{total}</small></div></div>
        <div className="kb-stat" data-tone="rose"><span><AlarmClock size={18} /></span><div><strong>{late}</strong><small>Quá hạn</small></div></div>
        <div className="kb-stat" data-tone="blue"><span><Loader size={18} /></span><div><strong>{counts.dang_lam}</strong><small>Đang làm</small></div></div>
        <div className="kb-stat" data-tone="gold"><span><Eye size={18} /></span><div><strong>{counts.cho_duyet}</strong><small>Chờ duyệt</small></div></div>
      </div>
    </section>

    <div className="kb-toolbar">
      <div className="kb-view-switch" role="group" aria-label="Chế độ xem"><button type="button" aria-pressed={mode === "board"} onClick={() => setMode("board")}><LayoutGrid size={17} />Bảng</button><button type="button" aria-pressed={mode === "people"} onClick={() => setMode("people")}><Users size={17} />Theo người</button><button type="button" onClick={() => document.getElementById("kb-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}><CalendarRange size={17} />Lịch</button></div>
      <div className="kb-toolbar-filters" role="group" aria-label="Lọc task"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Tất cả <b>{total}</b></button>{meId && <button type="button" aria-pressed={filter === "mine"} onClick={() => setFilter("mine")}>Của tôi <b>{mineCount}</b></button>}<button type="button" aria-pressed={filter === "late"} onClick={() => setFilter("late")}>Quá hạn <b>{late}</b></button></div>
      <label className="kb-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm task, người..." /></label>
    </div>

    {mode === "board" && <div className="kb-mobile-tabs" data-active={column} role="tablist" aria-label="Chọn cột trạng thái">{STATE_ORDER.map((state) => { const Icon = ICONS[state]; return <button key={state} type="button" role="tab" aria-selected={column === state} onClick={() => scrollColumn(state)}><Icon size={18} /><span>{STATES[state]}</span><b>{lane(state).length}</b></button>; })}</div>}

    <div className="kb-board-canvas">
        <DndContext collisionDetection={findDropTarget} sensors={sensors} onDragStart={({ active }) => setDraggedTask(tasks.find((task) => task.id === active.id) || null)} onDragCancel={() => setDraggedTask(null)} onDragEnd={({ active, over }) => { setDraggedTask(null); if (active && over) onMove?.(active.id, over.id); }}>
          {mode === "board" ? <div className="kanban-grid kb-pager" ref={pager} onScroll={mobile ? syncColumn : undefined}>{STATE_ORDER.map((state) => <div className={column === state ? "mobile-column" : "desktop-column"} key={state}><Column state={state} tasks={lane(state)} onCreateTask={onCreateTask} readOnly={readOnly} mobile={mobile} filtered={filter !== "all" || !!search} selectedId={selectedId} canOpen={canOpen} onSelect={setSelection} isMine={isMine} /></div>)}</div> : <PeopleView tasks={visible} members={members} canOpen={canOpen} selectedId={selectedId} onSelect={setSelection} isMine={isMine} />}
          <DragOverlay dropAnimation={null}>{draggedTask && <div className="kb-drag-overlay"><TaskCard task={draggedTask} locked={canOpen ? !canOpen(draggedTask) : false} mine={isMine(draggedTask)} /></div>}</DragOverlay>
        </DndContext>
    </div>
    </div>
    <aside className="kb-board-side">
      <div className="kb-side-tools"><div className="kb-density" aria-label="Mật độ hiển thị">{[["gon", "Gọn"], ["vua", "Vừa"], ["rong", "Rộng"]].map(([value, label]) => <button type="button" key={value} aria-pressed={density === value} onClick={() => setDensity(value)}>{label}</button>)}</div>{onCreateTask && <button className="kb-create-button" type="button" onClick={onCreateTask}><Plus size={19} />Tạo task</button>}</div>
      <Preview task={selected} onOpen={onOpen} onClear={() => setSelectedId(null)} canOpen={canOpen} />
    </aside>
  </div>;
}

function PeopleView({ tasks, members, canOpen, selectedId, onSelect, isMine }) {
  const [openMembers, setOpenMembers] = useState(() => new Set());

  return <div className="kb-people-view">{members.filter((member) => member.trang_thai === "dang_tham_gia").map((member) => {
    const assigned = tasks.filter((task) => (task.assignees || []).some((person) => person.member_id === member.member_id));
    const isOpen = openMembers.has(member.member_id);
    const FolderIcon = isOpen ? FolderOpen : Folder;
    const panelId = `kb-people-tasks-${member.member_id}`;

    return <section className="kb-people-group" data-open={isOpen || undefined} key={member.member_id}>
      <button className="kb-people-folder" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenMembers((current) => {
        const next = new Set(current);
        if (next.has(member.member_id)) next.delete(member.member_id);
        else next.add(member.member_id);
        return next;
      })}>
        <Avatar name={member.ho_ten} src={member.anh_dai_dien} size="sm" />
        <span className="kb-people-folder-icon"><FolderIcon size={18} /></span>
        <strong>{member.ho_ten}</strong>
        <span className="kb-people-folder-count">{assigned.length} task</span>
        <ChevronRight className="kb-people-folder-chevron" size={16} />
      </button>
      {isOpen && <div className="kb-people-tasks" id={panelId}>
        {assigned.length ? assigned.map((task) => <div key={task.id} className="kb-card-wrap" data-selected={selectedId === task.id || undefined}><TaskCard task={task} onOpen={onSelect} locked={canOpen ? !canOpen(task) : false} mine={isMine(task)} /></div>) : <p className="kb-people-empty">Chưa được giao task.</p>}
      </div>}
    </section>;
  })}</div>;
}
