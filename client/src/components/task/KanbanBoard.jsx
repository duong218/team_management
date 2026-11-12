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
import TaskCard from "./TaskCard";
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
        {title}
        <span className="count">{count}</span>
      </h2>
      {children}
    </div>
  );
}
function DragCard({ task, onOpen, onMove }) {
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
      <label>
        Chuyển sang...
        <select
          aria-label="Chuyển sang trạng thái"
          value={task.trang_thai}
          onChange={(e) => onMove(task.id, e.target.value)}
        >
          {STATE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATES[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export default function KanbanBoard({ tasks = [], onMove, onOpen }) {
  const [column, setColumn] = useState(STATE_ORDER[0]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  return (
    <>
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
                      onMove={onMove}
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