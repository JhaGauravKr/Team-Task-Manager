import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Projects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const { projects } = await api.listProjects(token);
      setProjects(projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createProject(token, name, description);
      setName("");
      setDescription("");
      setShowForm(false);
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your projects</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New project"}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {showForm && (
        <form className="inline-card" onSubmit={handleCreate}>
          <label>Project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="page-loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          You're not part of any projects yet. Create one to get started, or ask a teammate to add you by email.
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-top">
                <h3>{p.name}</h3>
                <span className={`badge badge-${p.myRole.toLowerCase()}`}>{p.myRole}</span>
              </div>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-card-footer">
                <span>{p._count.tasks} task{p._count.tasks === 1 ? "" : "s"}</span>
                <span>{p.members.length} member{p.members.length === 1 ? "" : "s"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
