import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import TaskBoard from "../components/TaskBoard.jsx";
import DashboardStats from "../components/DashboardStats.jsx";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { token, user } = useAuth();

  const [project, setProject] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("board"); // board | dashboard | members
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // new task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");

  // new member form
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [memberBusy, setMemberBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ project, myRole }, { tasks }, dashStats] = await Promise.all([
        api.getProject(token, projectId),
        api.listTasks(token, projectId),
        api.dashboard(token, projectId),
      ]);
      setProject(project);
      setMyRole(myRole);
      setTasks(tasks);
      setStats(dashStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const isAdmin = myRole === "ADMIN";

  async function handleCreateTask(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createTask(token, projectId, {
        title: taskTitle,
        description: taskDesc,
        dueDate: taskDue || null,
        priority: taskPriority,
        assigneeId: taskAssignee || null,
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDue("");
      setTaskPriority("MEDIUM");
      setTaskAssignee("");
      setShowTaskForm(false);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateTask(taskId, payload) {
    setError("");
    try {
      await api.updateTask(token, taskId, payload);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!confirm("Delete this task?")) return;
    setError("");
    try {
      await api.deleteTask(token, taskId);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberBusy(true);
    setError("");
    try {
      await api.addMember(token, projectId, memberEmail, memberRole);
      setMemberEmail("");
      setMemberRole("MEMBER");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setMemberBusy(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!confirm("Remove this member from the project?")) return;
    setError("");
    try {
      await api.removeMember(token, projectId, userId);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page-loading">Loading project…</div>;
  if (!project) return <div className="page">{error || "Project not found"}</div>;

  return (
    <div className="page">
      <Link to="/projects" className="back-link">
        ← All projects
      </Link>

      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="project-desc">{project.description}</p>}
        </div>
        <span className={`badge badge-${myRole.toLowerCase()}`}>{myRole}</span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="tabs">
        <button className={tab === "board" ? "tab active" : "tab"} onClick={() => setTab("board")}>
          Tasks
        </button>
        <button className={tab === "dashboard" ? "tab active" : "tab"} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button className={tab === "members" ? "tab active" : "tab"} onClick={() => setTab("members")}>
          Members
        </button>
      </div>

      {tab === "board" && (
        <>
          {isAdmin && (
            <div className="tab-actions">
              <button className="btn btn-primary" onClick={() => setShowTaskForm((s) => !s)}>
                {showTaskForm ? "Cancel" : "+ New task"}
              </button>
            </div>
          )}

          {showTaskForm && (
            <form className="inline-card" onSubmit={handleCreateTask}>
              <label>Title</label>
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />

              <label>Description</label>
              <textarea rows={2} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />

              <div className="form-row">
                <div>
                  <label>Due date</label>
                  <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                </div>
                <div>
                  <label>Priority</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label>Assignee</label>
                  <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {project.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary" type="submit">
                Create task
              </button>
            </form>
          )}

          <TaskBoard
            tasks={tasks}
            members={project.members}
            isAdmin={isAdmin}
            currentUserId={user.id}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        </>
      )}

      {tab === "dashboard" && <DashboardStats stats={stats} />}

      {tab === "members" && (
        <div>
          {isAdmin && (
            <form className="inline-card" onSubmit={handleAddMember}>
              <label>Member email</label>
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="teammate@example.com"
                required
              />
              <label>Role</label>
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button className="btn btn-primary" type="submit" disabled={memberBusy}>
                {memberBusy ? "Adding…" : "Add member"}
              </button>
            </form>
          )}

          <ul className="member-list">
            {project.members.map((m) => (
              <li key={m.user.id} className="member-row">
                <div>
                  <strong>{m.user.name}</strong>
                  <span className="muted"> {m.user.email}</span>
                </div>
                <div className="member-row-right">
                  <span className={`badge badge-${m.role.toLowerCase()}`}>{m.role}</span>
                  {isAdmin && m.user.id !== user.id && (
                    <button className="btn btn-ghost" onClick={() => handleRemoveMember(m.user.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
