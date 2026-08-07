import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

// Verifies the JWT in the Authorization header and attaches `req.user`
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Ensures req.user is an ADMIN on the project referenced by req.params.projectId
// (or req.body.projectId as a fallback). Attaches req.membership for downstream use.
export async function requireProjectAdmin(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this project" });
    }
    if (membership.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin role required for this action" });
    }
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

// Ensures req.user belongs to the project (either role). Attaches req.membership.
export async function requireProjectMember(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this project" });
    }
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}
