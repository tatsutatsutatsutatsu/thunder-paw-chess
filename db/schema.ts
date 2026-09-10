import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable(
  'rooms',
  {
    code: text('code', { length: 6 }).primaryKey(),
    hostToken: text('host_token').notNull().unique(),
    guestToken: text('guest_token').unique(),
    pgn: text('pgn').notNull().default(''),
    version: integer('version').notNull().default(0),
    status: text('status', { enum: ['waiting', 'playing', 'finished'] })
      .notNull()
      .default('waiting'),
    result: text('result'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('idx_rooms_updated_at').on(table.updatedAt)],
);
