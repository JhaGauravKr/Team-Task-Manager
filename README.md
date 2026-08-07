# TaskFlow — Team Task Manager

A full-stack collaborative task manager: create projects, invite teammates, assign tasks, track status, and see per-project dashboards. Built as a simplified Trello/Asana.

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | React 18 + Vite, React Router |
| Backend   | Node.js + Express (REST API) |
| Database  | PostgreSQL via Prisma ORM |
| Auth      | JWT (bcrypt-hashed passwords) |
| Deployment| Railway (two services: `backend`, `frontend`) |

## Data model

- **User** — name, email, password (hashed)
- **Project** — name, description, creator
- **ProjectMember** — join table linking a User to a Project with a per-project `role` (`ADMIN` or `MEMBER`) — this is what "creator becomes Admin" and role-based access is built on
- **Task** — title, description, dueDate, priority (`LOW`/`MEDIUM`/`HIGH`), status (`TODO`/`IN_PROGRESS`/`DONE`), belongs to a Project, optionally assigned to a User

Roles are **per-project**, not global: the same user can be an Admin on one project and a Member on another. Admins can create/edit/delete tasks, add/remove members, and assign work. Members can only view tasks and update the status of tasks assigned to them.

## Project structure

```
team-task-manager/
├── backend/            Express API + Prisma schema
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.js
│       ├── middleware/auth.js
│       └── routes/{auth,projects,tasks,dashboard}.js
└── frontend/           React (Vite) app
    └── src/
        ├── pages/{Login,Signup,Projects,ProjectDetail}.jsx
        ├── components/{TaskBoard,DashboardStats}.jsx
        ├── context/AuthContext.jsx
        └── api.js
```

## API reference (all under `/api`, JSON)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | – | Create account, returns JWT |
| POST | `/auth/login` | – | Log in, returns JWT |
| GET | `/auth/me` | ✔ | Current user |
| GET | `/projects` | ✔ | Projects the user belongs to |
| POST | `/projects` | ✔ | Create project (creator → Admin) |
| GET | `/projects/:id` | ✔ member | Project detail incl. members + tasks |
| POST | `/projects/:id/members` | ✔ admin | Add member by email |
| DELETE | `/projects/:id/members/:userId` | ✔ admin | Remove member |
| GET | `/tasks/project/:projectId` | ✔ member | List tasks |
| POST | `/tasks/project/:projectId` | ✔ admin | Create + assign task |
| PATCH | `/tasks/:id` | ✔ | Admin: edit any field. Member: status only, own tasks only |
| DELETE | `/tasks/:id` | ✔ admin | Delete task |
| GET | `/dashboard/project/:projectId` | ✔ member | Totals, by-status, per-user, overdue |

---

## Local setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local install, Docker, or a free instance from [Neon](https://neon.tech)/[Supabase](https://supabase.com)/Railway)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and JWT_SECRET to any long random string

npm install
npx prisma migrate dev --name init   # creates tables
npm run dev                          # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api  (already the default)

npm install
npm run dev     # starts on http://localhost:5173
```

Open `http://localhost:5173`, sign up, create a project, and add tasks. To test multi-user flows, sign up a second account in an incognito window and add it to your project by email from the **Members** tab.

---

## Deploying to Railway

This app deploys as **two Railway services** from the same GitHub repo, plus a **Postgres plugin**.

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: TaskFlow team task manager"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Create the Railway project
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select your repo.
2. **Add a database:** in the project canvas, click **+ New → Database → PostgreSQL**. Railway auto-generates a `DATABASE_URL`.

### 3. Configure the backend service
1. Add a service from the same repo, set **Root Directory** to `backend`.
2. Under **Variables**, add:
   - `DATABASE_URL` → reference the Postgres plugin's variable (Railway lets you do `${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET` → a long random string
   - `CLIENT_ORIGIN` → your frontend's Railway URL (set after step 4, e.g. `https://taskflow-frontend.up.railway.app`)
3. Railway auto-detects Node via Nixpacks. The included `backend/railway.json` sets the start command to run migrations then start the server:
   ```
   npx prisma migrate deploy && npm run start
   ```
4. Generate a public domain for this service (Settings → Networking → Generate Domain). Note the URL, e.g. `https://taskflow-backend.up.railway.app`.

### 4. Configure the frontend service
1. Add another service from the same repo, **Root Directory** set to `frontend`.
2. Under **Variables**, add:
   - `VITE_API_URL` → `https://taskflow-backend.up.railway.app/api` (the backend URL from step 3, + `/api`)
3. Build command: `npm run build`. Start command: `npm run preview -- --port $PORT --host 0.0.0.0` (or serve `dist/` with any static server — see note below).
4. Generate a public domain for this service too.
5. Go back to the **backend** service's `CLIENT_ORIGIN` variable and set it to this frontend URL, then redeploy the backend so CORS allows it.

> **Static hosting note:** `vite preview` works for a quick deploy but isn't meant for production traffic. For a more robust static deploy, add a tiny `serve` step: `npm i -g serve && serve -s dist -l $PORT` as the start command instead.

### 5. Verify
- Visit the backend URL + `/api/health` → should return `{"status":"ok"}`.
- Visit the frontend URL, sign up, create a project, create a task, confirm it's all connected end-to-end.

---

## Notes on design decisions

- **Per-project roles** rather than a single global role, since a real user is often an Admin on their own project and a Member on someone else's.
- **JWT auth** (stateless) rather than sessions, so the API can be deployed independently of the frontend without shared session storage.
- **Prisma + PostgreSQL** for typed queries, migrations, and straightforward relational modeling of Users ↔ Projects ↔ Tasks.
- Task board supports drag-and-drop between columns as well as a dropdown, for accessibility.
