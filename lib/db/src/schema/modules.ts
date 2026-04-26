import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moduleEnum = pgEnum("module_type", ["executio", "rural"]);

export const userModulesTable = pgTable("user_modules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  module: moduleEnum("module").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserModuleSchema = createInsertSchema(userModulesTable).omit({ id: true, activatedAt: true });
export type InsertUserModule = z.infer<typeof insertUserModuleSchema>;
export type UserModule = typeof userModulesTable.$inferSelect;
