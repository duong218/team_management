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
import { Circle, Loader, Eye, CircleCheck } from "lucide-react";
import TaskCard from "./TaskCard";
import "../../styles/kanban.css";
const ICONS = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck };
function DropColumn({ state, title, count, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: state });
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
      </h2>
      {children}
      {!count && <div className="kb-empty">Kéo thẻ vào đây</div>}
    </div>
  );
}
function DragCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners} aria-label="Kéo thẻ">
        <TaskCard task={task} onOpen={onOpen} />
      </div>
    </div>
  );
}
export default function KanbanBoard({ tasks = [], onMove, onOpen, hint }) {
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
      <div className="mobile-only">
        <label>
          Cột
          <select value={column} onChange={(e) => setColumn(e.target.value)}>
            {STATE_ORDER.map((s) => (
              <option value={s} key={s}>
                {STATES[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
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
              <DropColumn state={state} title={STATES[state]} count={tasks.filter((t) => t.trang_thai === state).length}>
                {tasks
                  .filter((t) => t.trang_thai === state)
                  .map((t) => (
                    <DragCard
                      key={t.id}
                      task={t}
                      onOpen={onOpen}
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