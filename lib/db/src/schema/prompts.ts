import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promptsTable = pgTable("prompts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  content: text("content").notNull(),
  module: text("module").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPromptSchema = createInsertSchema(promptsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof promptsTable.$inferSelect;
