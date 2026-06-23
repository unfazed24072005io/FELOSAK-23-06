var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import path from "node:path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookMembers: () => bookMembers,
  books: () => books,
  cloudDebts: () => cloudDebts,
  cloudTransactions: () => cloudTransactions,
  insertBookSchema: () => insertBookSchema,
  insertDebtSchema: () => insertDebtSchema,
  insertProductSchema: () => insertProductSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  products: () => products,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  numeric
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var books = pgTable("books", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var bookMembers = pgTable("book_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow()
});
var cloudTransactions = pgTable("cloud_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  category: text("category").notNull(),
  note: text("note").default(""),
  date: text("date").notNull(),
  paymentMode: text("payment_mode").default("cash"),
  attachment: text("attachment").default(""),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var cloudDebts = pgTable("cloud_debts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  note: text("note").default(""),
  phone: text("phone").default(""),
  dueDate: text("due_date").default(""),
  settled: boolean("settled").default(false),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 }).notNull().references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  image: text("image").default(""),
  category: text("category").default(""),
  inStock: boolean("in_stock").default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true
});
var insertBookSchema = createInsertSchema(books).pick({
  name: true,
  description: true
});
var insertTransactionSchema = createInsertSchema(cloudTransactions).pick({
  type: true,
  amount: true,
  category: true,
  note: true,
  date: true,
  paymentMode: true,
  attachment: true
});
var insertDebtSchema = createInsertSchema(cloudDebts).pick({
  direction: true,
  name: true,
  amount: true,
  note: true,
  phone: true,
  dueDate: true,
  settled: true
});
var insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  price: true,
  image: true,
  category: true,
  inStock: true
});

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = scryptSync(password, salt, 64).toString("hex");
  return hash === test;
}
var storage = {
  async createUser(data) {
    const hashed = hashPassword(data.password);
    const [user] = await db.insert(users).values({ ...data, password: hashed }).returning();
    return user;
  },
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  },
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
  async verifyLogin(username, password) {
    const user = await storage.getUserByUsername(username);
    if (!user) return null;
    if (!verifyPassword(password, user.password)) return null;
    return user;
  },
  async createBook(name, description, ownerId) {
    const [book] = await db.insert(books).values({ name, description, ownerId }).returning();
    await db.insert(bookMembers).values({
      bookId: book.id,
      userId: ownerId,
      role: "owner"
    });
    return book;
  },
  async getBook(bookId) {
    const [book] = await db.select().from(books).where(eq(books.id, bookId));
    return book;
  },
  async getUserBooks(userId) {
    const memberships = await db.select().from(bookMembers).where(eq(bookMembers.userId, userId));
    const result = [];
    for (const m of memberships) {
      const book = await storage.getBook(m.bookId);
      if (book) result.push({ ...book, role: m.role });
    }
    return result;
  },
  async updateBook(bookId, data) {
    const [book] = await db.update(books).set(data).where(eq(books.id, bookId)).returning();
    return book;
  },
  async deleteBook(bookId) {
    await db.delete(books).where(eq(books.id, bookId));
  },
  async getBookMembers(bookId) {
    const members = await db.select().from(bookMembers).where(eq(bookMembers.bookId, bookId));
    const result = [];
    for (const m of members) {
      const user = await storage.getUserById(m.userId);
      if (user) {
        result.push({ ...m, username: user.username, displayName: user.displayName });
      }
    }
    return result;
  },
  async getUserMembership(bookId, userId) {
    const [m] = await db.select().from(bookMembers).where(and(eq(bookMembers.bookId, bookId), eq(bookMembers.userId, userId)));
    return m;
  },
  async addBookMember(bookId, userId, role) {
    const [m] = await db.insert(bookMembers).values({ bookId, userId, role }).returning();
    return m;
  },
  async updateMemberRole(memberId, bookId, role) {
    const [m] = await db.update(bookMembers).set({ role }).where(and(eq(bookMembers.id, memberId), eq(bookMembers.bookId, bookId))).returning();
    return m;
  },
  async removeMember(memberId, bookId) {
    await db.delete(bookMembers).where(and(eq(bookMembers.id, memberId), eq(bookMembers.bookId, bookId)));
  },
  async getBookTransactions(bookId) {
    return db.select().from(cloudTransactions).where(eq(cloudTransactions.bookId, bookId)).orderBy(cloudTransactions.createdAt);
  },
  async addTransaction(bookId, data, userId) {
    const [tx] = await db.insert(cloudTransactions).values({ ...data, bookId, createdBy: userId }).returning();
    return tx;
  },
  async updateTransaction(txId, bookId, data) {
    const [tx] = await db.update(cloudTransactions).set(data).where(and(eq(cloudTransactions.id, txId), eq(cloudTransactions.bookId, bookId))).returning();
    return tx;
  },
  async deleteTransaction(txId, bookId) {
    await db.delete(cloudTransactions).where(and(eq(cloudTransactions.id, txId), eq(cloudTransactions.bookId, bookId)));
  },
  async getBookDebts(bookId) {
    return db.select().from(cloudDebts).where(eq(cloudDebts.bookId, bookId)).orderBy(cloudDebts.createdAt);
  },
  async addDebt(bookId, data, userId) {
    const [debt] = await db.insert(cloudDebts).values({ ...data, bookId, createdBy: userId }).returning();
    return debt;
  },
  async updateDebt(debtId, bookId, data) {
    const [debt] = await db.update(cloudDebts).set(data).where(and(eq(cloudDebts.id, debtId), eq(cloudDebts.bookId, bookId))).returning();
    return debt;
  },
  async deleteDebt(debtId, bookId) {
    await db.delete(cloudDebts).where(and(eq(cloudDebts.id, debtId), eq(cloudDebts.bookId, bookId)));
  },
  async getBookProducts(bookId) {
    return db.select().from(products).where(eq(products.bookId, bookId)).orderBy(products.createdAt);
  },
  async addProduct(bookId, data, userId) {
    const [product] = await db.insert(products).values({ ...data, bookId, createdBy: userId }).returning();
    return product;
  },
  async updateProduct(productId, bookId, data) {
    const [product] = await db.update(products).set(data).where(and(eq(products.id, productId), eq(products.bookId, bookId))).returning();
    return product;
  },
  async deleteProduct(productId, bookId) {
    await db.delete(products).where(and(eq(products.id, productId), eq(products.bookId, bookId)));
  },
  async getPublicStoreProducts(bookId) {
    const book = await storage.getBook(bookId);
    if (!book) return null;
    const prods = await db.select().from(products).where(and(eq(products.bookId, bookId), eq(products.inStock, true))).orderBy(products.createdAt);
    return { bookName: book.name, products: prods };
  }
};

// server/routes.ts
function param(req, name) {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val || "";
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
async function requireBookAccess(req, res, next) {
  const bookId = param(req, "id") || param(req, "bookId");
  const userId = req.session.userId;
  const membership = await storage.getUserMembership(bookId, userId);
  if (!membership) {
    return res.status(403).json({ message: "Not a member of this book" });
  }
  req.membership = membership;
  next();
}
async function requireBookOwner(req, res, next) {
  const membership = req.membership;
  if (!membership || membership.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }
  next();
}
async function requireBookEditor(req, res, next) {
  const membership = req.membership;
  if (!membership || membership.role !== "owner" && membership.role !== "editor") {
    return res.status(403).json({ message: "Editor access required" });
  }
  next();
}
async function registerRoutes(app2) {
  const PgSession = connectPgSimple(session);
  app2.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15
      }),
      secret: process.env.SESSION_SECRET || "misr-cashbook-secret-dev",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      const user = await storage.createUser({ username, password, displayName });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName });
    } catch (e) {
      console.error("Register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const user = await storage.verifyLogin(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName });
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.json(null);
    }
    res.json({ id: user.id, username: user.username, displayName: user.displayName });
  });
  app2.get("/api/books", requireAuth, async (req, res) => {
    try {
      const bks = await storage.getUserBooks(req.session.userId);
      res.json(bks);
    } catch (e) {
      console.error("Get books error:", e);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });
  app2.post("/api/books", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Book name is required" });
      }
      const book = await storage.createBook(name, description || "", req.session.userId);
      res.json({ ...book, role: "owner" });
    } catch (e) {
      console.error("Create book error:", e);
      res.status(500).json({ message: "Failed to create book" });
    }
  });
  app2.get("/api/books/:id", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const book = await storage.getBook(param(req, "id"));
      if (!book) return res.status(404).json({ message: "Book not found" });
      const members = await storage.getBookMembers(param(req, "id"));
      res.json({ ...book, members, role: req.membership.role });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });
  app2.put("/api/books/:id", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      const { name, description } = req.body;
      const book = await storage.updateBook(param(req, "id"), { name, description });
      res.json(book);
    } catch (e) {
      res.status(500).json({ message: "Failed to update book" });
    }
  });
  app2.delete("/api/books/:id", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      await storage.deleteBook(param(req, "id"));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });
  app2.get("/api/books/:id/members", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const members = await storage.getBookMembers(param(req, "id"));
      res.json(members);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });
  app2.post("/api/books/:id/members", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { username, role } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      const assignRole = role || "viewer";
      if (!["viewer", "editor"].includes(assignRole)) {
        return res.status(400).json({ message: "Role must be viewer or editor" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const existing = await storage.getUserMembership(param(req, "id"), user.id);
      if (existing) {
        return res.status(409).json({ message: "User is already a member" });
      }
      const member = await storage.addBookMember(param(req, "id"), user.id, assignRole);
      res.json({ ...member, username: user.username, displayName: user.displayName });
    } catch (e) {
      res.status(500).json({ message: "Failed to add member" });
    }
  });
  app2.put("/api/books/:id/members/:memberId", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !["owner", "editor", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Valid role required (owner, editor, viewer)" });
      }
      const m = await storage.updateMemberRole(param(req, "memberId"), param(req, "id"), role);
      res.json(m);
    } catch (e) {
      res.status(500).json({ message: "Failed to update member" });
    }
  });
  app2.delete("/api/books/:id/members/:memberId", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      await storage.removeMember(param(req, "memberId"), param(req, "id"));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });
  app2.get("/api/books/:id/transactions", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const txs = await storage.getBookTransactions(param(req, "id"));
      res.json(txs);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  const VALID_PAYMENT_MODES = ["cash", "instapay", "vodafone_cash", "fawry", "bank_transfer", "international", "cheque", "other"];
  app2.post("/api/books/:id/transactions", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { type, amount, category, note, date, paymentMode, attachment } = req.body;
      if (!type || !amount || !category || !date) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const mode = paymentMode && VALID_PAYMENT_MODES.includes(paymentMode) ? paymentMode : "cash";
      const attach = typeof attachment === "string" ? attachment.substring(0, 5 * 1024 * 1024) : "";
      const tx = await storage.addTransaction(param(req, "id"), { type, amount: String(amount), category, note: note || "", date, paymentMode: mode, attachment: attach }, req.session.userId);
      res.json(tx);
    } catch (e) {
      res.status(500).json({ message: "Failed to add transaction" });
    }
  });
  app2.put("/api/books/:id/transactions/:txId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { type, amount, category, note, date, paymentMode, attachment } = req.body;
      const updateData = {};
      if (type) updateData.type = type;
      if (amount !== void 0) updateData.amount = String(amount);
      if (category) updateData.category = category;
      if (note !== void 0) updateData.note = note;
      if (date) updateData.date = date;
      if (paymentMode !== void 0) updateData.paymentMode = VALID_PAYMENT_MODES.includes(paymentMode) ? paymentMode : "cash";
      if (attachment !== void 0) updateData.attachment = typeof attachment === "string" ? attachment.substring(0, 5 * 1024 * 1024) : "";
      const tx = await storage.updateTransaction(param(req, "txId"), param(req, "id"), updateData);
      res.json(tx);
    } catch (e) {
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  app2.delete("/api/books/:id/transactions/:txId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      await storage.deleteTransaction(param(req, "txId"), param(req, "id"));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });
  app2.get("/api/books/:id/debts", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const debts = await storage.getBookDebts(param(req, "id"));
      res.json(debts);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch debts" });
    }
  });
  app2.post("/api/books/:id/debts", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { direction, name, amount, note, phone, dueDate, settled } = req.body;
      if (!direction || !name || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const debt = await storage.addDebt(param(req, "id"), { direction, name, amount: String(amount), note: note || "", phone: phone || "", dueDate: dueDate || "", settled: settled || false }, req.session.userId);
      res.json(debt);
    } catch (e) {
      res.status(500).json({ message: "Failed to add debt" });
    }
  });
  app2.put("/api/books/:id/debts/:debtId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { direction, name, amount, note, phone, dueDate, settled } = req.body;
      const updateData = {};
      if (direction) updateData.direction = direction;
      if (name) updateData.name = name;
      if (amount !== void 0) updateData.amount = String(amount);
      if (note !== void 0) updateData.note = note;
      if (phone !== void 0) updateData.phone = phone;
      if (dueDate !== void 0) updateData.dueDate = dueDate;
      if (settled !== void 0) updateData.settled = settled;
      const debt = await storage.updateDebt(param(req, "debtId"), param(req, "id"), updateData);
      res.json(debt);
    } catch (e) {
      res.status(500).json({ message: "Failed to update debt" });
    }
  });
  app2.delete("/api/books/:id/debts/:debtId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      await storage.deleteDebt(param(req, "debtId"), param(req, "id"));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete debt" });
    }
  });
  app2.get("/api/books/:id/products", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const prods = await storage.getBookProducts(param(req, "id"));
      res.json(prods);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  app2.post("/api/books/:id/products", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { name, description, price, image, category, inStock } = req.body;
      if (!name || price === void 0) {
        return res.status(400).json({ message: "Name and price are required" });
      }
      const imgData = typeof image === "string" ? image.substring(0, 5 * 1024 * 1024) : "";
      const product = await storage.addProduct(param(req, "id"), {
        name,
        description: description || "",
        price: String(price),
        image: imgData,
        category: category || "",
        inStock: inStock !== false
      }, req.session.userId);
      res.json(product);
    } catch (e) {
      res.status(500).json({ message: "Failed to add product" });
    }
  });
  app2.put("/api/books/:id/products/:productId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { name, description, price, image, category, inStock } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== void 0) updateData.description = description;
      if (price !== void 0) updateData.price = String(price);
      if (image !== void 0) updateData.image = typeof image === "string" ? image.substring(0, 5 * 1024 * 1024) : "";
      if (category !== void 0) updateData.category = category;
      if (inStock !== void 0) updateData.inStock = inStock;
      const product = await storage.updateProduct(param(req, "productId"), param(req, "id"), updateData);
      res.json(product);
    } catch (e) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  app2.delete("/api/books/:id/products/:productId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      await storage.deleteProduct(param(req, "productId"), param(req, "id"));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  app2.get("/api/store/:bookId", async (req, res) => {
    try {
      const data = await storage.getPublicStoreProducts(param(req, "bookId"));
      if (!data) return res.status(404).json({ message: "Store not found" });
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to load store" });
    }
  });
  app2.get("/store/:bookId", async (_req, res) => {
    res.sendFile("storefront.html", { root: path.resolve(process.cwd(), "server", "templates") });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path2 from "path";
var app = express();
app.set("trust proxy", 1);
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  app2.use(express.static(path2.resolve(process.cwd(), "dist")));
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.method !== "GET") return next();
    const indexPath = path2.resolve(process.cwd(), "dist", "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
