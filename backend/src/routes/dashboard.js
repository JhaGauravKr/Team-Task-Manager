import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireProjectMember } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Dashboard stats scoped to a single project: totals, by-status, per-user, overdue
router.get("/project/:projectId", requireProjectMember, async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: { assignee: { select: { id: true, name: true } } },
    });

    const now = new Date();
    const totalTasks = tasks.length;

    const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    const perUserMap = {};
    let overdue = 0;

    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      const key = t.assignee ? t.assignee.name : "Unassigned";
      perUserMap[key] = (perUserMap[key] || 0) + 1;

      if (t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE") {
        overdue += 1;
      }
    }

    const perUser = Object.entries(perUserMap).map(([name, count]) => ({ name, count }));

    res.json({
      totalTasks,
      byStatus,
      perUser,
      overdueTasks: overdue,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
