import { useState } from "react";

const COLUMNS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];

function isOverdue(task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";
}

export default function TaskBoard({ tasks, members, isAdmin, currentUserId, onUpdate, onDelete }) {
  const [dragTaskId, setDragTaskId] = useState(null);

  function canEditStatus(task) {
    return isAdmin || task.assigneeId === currentUserId;
  }

  function handleDrop(status) {
    if (!dragTaskId) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (task && canEditStatus(task) && task.status !== status) {
      onUpdate(task.id, { status });
    }
    setDragTaskId(null);
  }

  return (
    <div className="board">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className="board-column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.key)}
        >
          <div className="board-column-header">
            <h4>{col.label}</h4>
            <span className="board-count">{tasks.filter((t) => t.status === col.key).length}</span>
          </div>

          <div className="board-column-body">
            {tasks
              .filter((t) => t.status === col.key)
              .map((task) => (
                <div
                  key={task.id}
                  className={`task-card priority-${task.priority.toLowerCase()} ${isOverdue(task) ? "task-overdue" : ""}`}
                  draggable={canEditStatus(task)}
                  onDragStart={() => setDragTaskId(task.id)}
                >
                  <div className="task-card-top">
                    <span className="task-priority">{task.priority}</span>
                    {isAdmin && (
                      <button className="task-delete" onClick={() => onDelete(task.id)} title="Delete task">
                        ×
                      </button>
                    )}
                  </div>
                  <h5>{task.title}</h5>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <div className="task-card-footer">
                    <span>{task.assignee ? task.assignee.name : "Unassigned"}</span>
                    {task.dueDate && (
                      <span className={isOverdue(task) ? "overdue-tag" : ""}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {canEditStatus(task) && (
                    <select
                      className="status-select"
                      value={task.status}
                      onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
