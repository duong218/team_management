import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState, useSyncExternalStore } from "react";
import { STATE_ORDER, STATES } from "../../lib/constants";
import { Circle, Loader, Eye, CircleCheck, Plus, MoveHorizontal } from "lucide-react";
import TaskCard from "./TaskCard";
import "../../styles/kanban.css";
const MQ = "(max-width: 760px)";
const subscribeMQ = (cb) => { const m = matchMedia(MQ); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useIsMobile = () => useSyncExternalStore(subscribeMQ, () => matchMedia(MQ).matches, () => false);
const ICONS = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck };
function DropColumn({ state, title, count, children, readOnly, mobile, onCreateTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: state, disabled: readOnly || mobile });
  return (
    <div
      ref={setNodeRef}
      data-state={state}
      className="card"
      data-over={isOver}
    >
      <h2>
        <span className="kb-ico">{(() => { const Icon = ICONS[state]; return <Icon size={16} />; })()}</span>
        {title}
        <span className="count">{count}</span>
        {state === "can_lam" && onCreateTask && count > 0 && <button type="button" className="kb-add-task" aria-label="Tạo task" title="Tạo task" onClick={onCreateTask}><Plus size={18} /></button>}
      </h2>
      {children}
      {!count && state === "can_lam" && onCreateTask ? <button type="button" className="kb-empty kb-empty-create" onClick={onCreateTask}><span><Plus size={28} /></span><strong>Tạo task</strong><small>Nhấn để thêm công việc mới</small></button> : !count && <div className="kb-empty">{readOnly ? "Không có task" : mobile ? "Chưa có task ở cột này" : "Kéo thẻ vào đây"}</div>}
    </div>
  );
}
function DragCard({ task, onOpen, locked, readOnly, mobile }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: readOnly || mobile }),
    off = readOnly || mobile;
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div {...(off ? {} : { ...attributes, ...listeners, "aria-label": "Kéo thẻ" })}>
        <TaskCard task={task} onOpen={onOpen} locked={locked} />
      </div>
    </div>
  );
}
export default function KanbanBoard({ tasks = [], onMove, onOpen, onCreateTask, canOpen, hint, readOnly = false }) {
  const [column, setColumn] = useState(STATE_ORDER[0]),
    mobile = useIsMobile(),
    pager = useRef(null),
    ind = useRef(null);
  // Điện thoại: các cột nằm ngang trong một khung cuộn có "snap". Ngón tay kéo trực tiếp (1:1), thanh tab trượt theo đúng vị trí cuộn.
  const geo = () => {
    const el = pager.current;
    if (!el || el.children.length < 2) return null;
    const a = el.children[0], step = el.children[1].offsetLeft - a.offsetLeft;
    return { step, first: a.offsetLeft + a.offsetWidth / 2 - el.clientWidth / 2 }; // scrollLeft khi cột đầu nằm giữa khung
  };
  function onPagerScroll() {
    const g = geo();
    if (!g) return;
    const el = pager.current, last = STATE_ORDER.length - 1,
      lo = Math.max(0, g.first), hi = Math.min(el.scrollWidth - el.clientWidth, g.first + last * g.step), // hai đầu cuộn không tới tâm cột nên chuẩn hóa lại
      p = hi > lo ? Math.min(last, Math.max(0, ((el.scrollLeft - lo) / (hi - lo)) * last)) : 0;
    if (ind.current) ind.current.style.transform = `translateX(${p * 100}%)`;
    const next = STATE_ORDER[Math.round(p)];
    if (next !== column) setColumn(next);
  }
  function goTo(st) {
    setColumn(st);
    const g = geo();
    if (mobile && g) pager.current.scrollTo({ left: g.first + STATE_ORDER.indexOf(st) * g.step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const total = tasks.length,
    done = tasks.filter((t) => t.trang_thai === "hoan_thanh").length;
  return (
    <>
      {total > 0 && (
        <div className="kb-sum">
          <div className="kb-sum-top">
            <b>{done}/{total} task hoàn thành</b>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="kb-seg" role="img" aria-label="Phân bố task theo trạng thái">
            {STATE_ORDER.map((st) => {
              const n = tasks.filter((t) => t.trang_thai === st).length;
              return n > 0 && <i key={st} data-state={st} style={{ flexGrow: n }} />;
            })}
          </div>
          <div className="kb-legend">
            {STATE_ORDER.map((st) => {
              const Icon = ICONS[st];
              return (
                <span key={st} data-state={st}>
                  <Icon size={14} />
                  {STATES[st]} <b>{tasks.filter((t) => t.trang_thai === st).length}</b>
                </span>
              );
            })}
          </div>
        </div>
      )}
      {hint}
      <div className="kb-tabs" data-active={column} role="tablist" aria-label="Chọn cột trạng thái">
        <i className="kb-ind" ref={ind} aria-hidden="true" />
        {STATE_ORDER.map((st) => {
          const Icon = ICONS[st];
          return (
            <button key={st} type="button" role="tab" aria-selected={column === st} data-state={st} onClick={() => goTo(st)}>
              <Icon size={16} aria-hidden="true" />
              <b>{tasks.filter((t) => t.trang_thai === st).length}</b>
              <span>{STATES[st]}</span>
            </button>
          );
        })}
      </div>
      {!readOnly && <p className="kb-pc-note"><MoveHorizontal size={16} aria-hidden="true" />Vuốt ngang để đổi cột. Mở task để đổi trạng thái.</p>}
      <DndContext
        sensors={sensors}
        onDragEnd={({ active, over }) =>
          active && over && onMove?.(active.id, over.id)
        }
      >
        <div className={`kanban-grid kb-pager${mobile && onCreateTask && !readOnly ? " has-fab" : ""}`} ref={pager} onScroll={mobile ? onPagerScroll : undefined}>
          {STATE_ORDER.map((state) => (
            <div
              className={column === state ? "mobile-column" : "desktop-column"}
              key={state}
            >
              <DropColumn state={state} title={STATES[state]} count={tasks.filter((t) => t.trang_thai === state).length} readOnly={readOnly} mobile={mobile} onCreateTask={onCreateTask}>
                {tasks
                  .filter((t) => t.trang_thai === state)
                  .map((t) => (
                    <DragCard
                      key={t.id}
                      task={t}
                      onOpen={onOpen}
                      locked={canOpen ? !canOpen(t) : false}
                      readOnly={readOnly}
                      mobile={mobile}
                    />
                  ))}
              </DropColumn>
            </div>
          ))}
        </div>
      </DndContext>
      {mobile && onCreateTask && !readOnly && (
        <button type="button" className="kb-fab" onClick={onCreateTask}>
          <Plus size={22} aria-hidden="true" />
          Tạo task
        </button>
      )}
    </>
  );
}