import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { bridgeQuery, bridgeQueryOne } from "./bridge";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;

  const userEmail =
    (auth as any)?.sessionClaims?.email as string | undefined ??
    (auth as any)?.sessionClaims?.primaryEmail as string | undefined ??
    `${userId}@unknown.com`;
  const userName =
    (auth as any)?.sessionClaims?.name as string | undefined ??
    (auth as any)?.sessionClaims?.firstName as string | undefined ??
    null;

  getOrCreateUser(userId, userEmail, userName).catch(() => {});

  next();
};

export async function getOrCreateUser(clerkUserId: string, email: string, name?: string | null) {
  const existing = await bridgeQueryOne(
    "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
    [clerkUserId]
  );
  if (existing) return existing;

  const user = await bridgeQueryOne(
    `INSERT INTO users (id, email, name, role)
     VALUES ($1, $2, $3, 'user')
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, email, name, role, created_at`,
    [clerkUserId, email, name ?? null]
  );

  return user!;
}
