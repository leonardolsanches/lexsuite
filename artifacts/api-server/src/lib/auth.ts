import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
};

export async function getOrCreateUser(clerkUserId: string, email: string, name?: string | null) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, clerkUserId)).limit(1);
  if (existing.length > 0) return existing[0];
  const [user] = await db.insert(usersTable).values({
    id: clerkUserId,
    email,
    name: name ?? null,
    role: "user",
  }).returning();
  return user;
}
