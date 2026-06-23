import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const books = pgTable("books", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookMembers = pgTable("book_members", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cloudTransactions = pgTable("cloud_transactions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  category: text("category").notNull(),
  note: text("note").default(""),
  date: text("date").notNull(),
  paymentMode: text("payment_mode").default("cash"),
  attachment: text("attachment").default(""),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cloudDebts = pgTable("cloud_debts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  note: text("note").default(""),
  phone: text("phone").default(""),
  dueDate: text("due_date").default(""),
  settled: boolean("settled").default(false),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  image: text("image").default(""),
  category: text("category").default(""),
  inStock: boolean("in_stock").default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessProfiles = pgTable("business_profiles", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  logo: text("logo").default(""),
  address: text("address").default(""),
  city: text("city").default(""),
  country: text("country").default("Egypt"),
  phone: text("phone").default(""),
  email: text("email").default(""),
  website: text("website").default(""),
  taxId: text("tax_id").default(""),
  registrationNo: text("registration_no").default(""),
  bankName: text("bank_name").default(""),
  bankAccount: text("bank_account").default(""),
  bankIban: text("bank_iban").default(""),
  termsAndConditions: text("terms_and_conditions").default(""),
  footerNote: text("footer_note").default(""),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").default(""),
  clientPhone: text("client_phone").default(""),
  clientAddress: text("client_address").default(""),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").default(""),
  items: text("items").default("[]"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes").default(""),
  status: text("status").default("draft"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertBookSchema = createInsertSchema(books).pick({
  name: true,
  description: true,
});

export const insertTransactionSchema = createInsertSchema(cloudTransactions).pick({
  type: true,
  amount: true,
  category: true,
  note: true,
  date: true,
  paymentMode: true,
  attachment: true,
});

export const insertDebtSchema = createInsertSchema(cloudDebts).pick({
  direction: true,
  name: true,
  amount: true,
  note: true,
  phone: true,
  dueDate: true,
  settled: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  image: true,
  category: true,
  inStock: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Book = typeof books.$inferSelect;
export type BookMember = typeof bookMembers.$inferSelect;
export type CloudTransaction = typeof cloudTransactions.$inferSelect;
export type CloudDebt = typeof cloudDebts.$inferSelect;
export type Product = typeof products.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
