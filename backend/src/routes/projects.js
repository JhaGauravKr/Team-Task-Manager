import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireProjectAdmin, requireProjectMember } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// List all projects the current user belongs to
router.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
            _count: { select: { tasks: true } },
          },
        },
      },
    });

    const projects = memberships.map((m) => ({
      ...m.project,
      myRole: m.role,
    }));

    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// Create a project; creator becomes ADMIN automatically
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });

    const project = await prisma.project.create({
      data: {
        name,
        description,
        creatorId: req.user.id,
        members: {
          create: { userId: req.user.id, role: "ADMIN" },
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// Get single project detail (must be a member)
router.get("/:projectId", requireProjectMember, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: { include: { assignee: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ project, myRole: req.membership.role });
  } catch (err) {
    next(err);
  }
});

// Admin adds a member by email
router.post("/:projectId/members", requireProjectAdmin, async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: "No user found with that email" });

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: req.params.projectId } },
    });
    if (existing) return res.status(409).json({ error: "User is already a member of this project" });

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: req.params.projectId,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
});

// Admin removes a member
router.delete("/:projectId/members/:userId", requireProjectAdmin, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Admins cannot remove themselves; transfer ownership first" });
    }

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId, projectId } },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
