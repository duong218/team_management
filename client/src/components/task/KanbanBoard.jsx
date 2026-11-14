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
import { useState } from "react";
import { STATE_ORDER, STATES } from "../../lib/constants";
import { Circle, Loader, Eye, CircleCheck, Plus, Monitor } from "lucide-react";
import TaskCard from "./TaskCard";
import "../../styles/kanban.css";
const ICONS = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck };
function DropColumn({ state, title, count, children, readOnly, onCreateTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: state, disabled: readOnly });
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
      {!count && state === "can_lam" && onCreateTask ? <button type="button" className="kb-empty kb-empty-create" onClick={onCreateTask}><span><Plus size={28} /></span><strong>Tạo task</strong><small>Nhấn để thêm công việc mới</small></button> : !count && <div className="kb-empty">{readOnly ? "Không có task" : "Kéo thẻ vào đây"}</div>}
    </div>
  );
}
function DragCard({ task, onOpen, locked, readOnly }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: readOnly });
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners} aria-label="Kéo thẻ">
        <TaskCard task={task} onOpen={onOpen} locked={locked} />
      </div>
    </div>
  );
}
export default function KanbanBoard({ tasks = [], onMove, onOpen, onCreateTask, canOpen, hint, readOnly = false }) {
  const [column, setColumn] = useState(STATE_ORDER[0]);
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
      <div className="kb-tabs" role="tablist" aria-label="Chọn cột trạng thái">
        {STATE_ORDER.map((st) => {
          const Icon = ICONS[st];
          return (
            <button key={st} type="button" role="tab" aria-selected={column === st} data-state={st} onClick={() => setColumn(st)}>
              <Icon size={16} aria-hidden="true" />
              <b>{tasks.filter((t) => t.trang_thai === st).length}</b>
              <span>{STATES[st]}</span>
            </button>
          );
        })}
      </div>
      {!readOnly && <p className="kb-pc-note"><Monitor size={16} aria-hidden="true" />Nên dùng máy tính để kéo thả thẻ giữa các cột cho tiện hơn.</p>}
      <DndContext
        sensors={sensors}
        onDragEnd={({ active, over }) =>
          active && over && onMove?.(active.id, over.id)
        }
      >
        <div className="kanban-grid">
          {STATE_ORDER.map((state) => (
            <div
              className={column === state ? "mobile-column" : "desktop-column"}
              key={state}
            >
              <DropColumn state={state} title={STATES[state]} count={tasks.filter((t) => t.trang_thai === state).length} readOnly={readOnly} onCreateTask={onCreateTask}>
                {tasks
                  .filter((t) => t.trang_thai === state)
                  .map((t) => (
                    <DragCard
                      key={t.id}
                      task={t}
                      onOpen={onOpen}
                      locked={canOpen ? !canOpen(t) : false}
                      readOnly={readOnly}
                    />
                  ))}
              </DropColumn>
            </div>
          ))}
        </div>
      </DndContext>
    </>
  );
}