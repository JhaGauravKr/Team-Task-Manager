export default function DashboardStats({ stats }) {
  if (!stats) return null;
  const { totalTasks, byStatus, perUser, overdueTasks } = stats;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-value">{totalTasks}</span>
        <span className="stat-label">Total tasks</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{byStatus.TODO || 0}</span>
        <span className="stat-label">To do</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{byStatus.IN_PROGRESS || 0}</span>
        <span className="stat-label">In progress</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{byStatus.DONE || 0}</span>
        <span className="stat-label">Done</span>
      </div>
      <div className="stat-card stat-card-warning">
        <span className="stat-value">{overdueTasks}</span>
        <span className="stat-label">Overdue</span>
      </div>
      <div className="stat-card stat-card-wide">
        <span className="stat-label">Tasks per user</span>
        <ul className="per-user-list">
          {perUser.length === 0 && <li className="muted">No tasks yet</li>}
          {perUser.map((u) => (
            <li key={u.name}>
              <span>{u.name}</span>
              <span>{u.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
