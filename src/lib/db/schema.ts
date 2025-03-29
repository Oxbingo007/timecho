import { sql } from '@vercel/postgres'
import { z } from 'zod'
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { type InferModel } from 'drizzle-orm'

// 访谈记录表
export const interviews = sqliteTable('interviews', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  userId: text('user_id').notNull(),
})

// 访谈消息表
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  interviewId: text('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  isSelected: integer('is_selected', { mode: 'boolean' }).notNull().default(false),
})

// 访谈纪要表
export const summaries = sqliteTable('summaries', {
  id: text('id').primaryKey(),
  interviewId: text('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// 类型定义
export type Interview = InferModel<typeof interviews>
export type Message = InferModel<typeof messages>
export type Summary = InferModel<typeof summaries>

// Schema 验证
export const InterviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
})

export const MessageSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.date(),
  isSelected: z.boolean(),
})

export const SummarySchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  content: z.string(),
  createdAt: z.date(),
}) 