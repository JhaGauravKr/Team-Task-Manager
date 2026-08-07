const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  signup: (name, email, password) => request("/auth/signup", { method: "POST", body: { name, email, password } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/auth/me", { token }),

  listProjects: (token) => request("/projects", { token }),
  createProject: (token, name, description) =>
    request("/projects", { method: "POST", body: { name, description }, token }),
  getProject: (token, projectId) => request(`/projects/${projectId}`, { token }),
  addMember: (token, projectId, email, role) =>
    request(`/projects/${projectId}/members`, { method: "POST", body: { email, role }, token }),
  removeMember: (token, projectId, userId) =>
    request(`/projects/${projectId}/members/${userId}`, { method: "DELETE", token }),

  listTasks: (token, projectId) => request(`/tasks/project/${projectId}`, { token }),
  createTask: (token, projectId, payload) =>
    request(`/tasks/project/${projectId}`, { method: "POST", body: payload, token }),
  updateTask: (token, taskId, payload) =>
    request(`/tasks/${taskId}`, { method: "PATCH", body: payload, token }),
  deleteTask: (token, taskId) => request(`/tasks/${taskId}`, { method: "DELETE", token }),

  dashboard: (token, projectId) => request(`/dashboard/project/${projectId}`, { token }),
};
