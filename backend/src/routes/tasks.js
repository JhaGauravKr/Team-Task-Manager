import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireProjectMember, requireProjectAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const VALID_STATUS = ["TODO", "IN_PROGRESS", "DONE"];
const VALID_PRIORITY = ["LOW", "MEDIUM", "HIGH"];

// List tasks for a project (any member)
router.get("/project/:projectId", requireProjectMember, async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: { assignee: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// Create a task — only project ADMIN can create/assign tasks
router.post("/project/:projectId", requireProjectAdmin, async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, assigneeId } = req.body;
    if (!title) return res.status(400).json({ error: "Task title is required" });
    if (priority && !VALID_PRIORITY.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of ${VALID_PRIORITY.join(", ")}` });
    }

    if (assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: assigneeId, projectId: req.params.projectId } },
      });
      if (!isMember) {
        return res.status(400).json({ error: "Assignee must be a member of this project" });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "MEDIUM",
        projectId: req.params.projectId,
        assigneeId: assigneeId || null,
        creatorId: req.user.id,
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// Update a task. Admins can edit everything; members may only update status
// on tasks assigned to them.
router.patch("/:taskId", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } },
    });
    if (!membership) return res.status(403).json({ error: "You are not a member of this project" });

    const isAdmin = membership.role === "ADMIN";
    const isOwnTask = task.assigneeId === req.user.id;

    if (!isAdmin && !isOwnTask) {
      return res.status(403).json({ error: "You can only update tasks assigned to you" });
    }

    const { title, description, dueDate, priority, assigneeId, status } = req.body;
    const data = {};

    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) {
        return res.status(400).json({ error: `Status must be one of ${VALID_STATUS.join(", ")}` });
      }
      data.status = status;
    }

    // Only admins may change these fields
    if (isAdmin) {
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (priority !== undefined) {
        if (!VALID_PRIORITY.includes(priority)) {
          return res.status(400).json({ error: `Priority must be one of ${VALID_PRIORITY.join(", ")}` });
        }
        data.priority = priority;
      }
      if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
    } else if (title || description || dueDate || priority || assigneeId) {
      return res.status(403).json({ error: "Members may only update the status of their own tasks" });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data,
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// Delete a task — admin only
router.delete("/:taskId", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin role required to delete tasks" });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
