import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workflowsTable = pgTable("workflows", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  module: text("module").notNull(),
  category: text("category"),
  promptKey: text("prompt_key").notNull(),
  fields: text("fields").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflowsTable).omit({ id: true, createdAt: true });
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflowsTable.$inferSelect;
