import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  smallint,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "manager", "admin"]);
export const segmentEnum = pgEnum("segment", ["b2c", "b2b"]);
export const b2bStatusEnum = pgEnum("b2b_status", ["none", "pending", "approved", "rejected"]);
export const generatorTypeEnum = pgEnum("generator_type", ["gasoline", "diesel", "gas", "inverter"]);
export const startTypeEnum = pgEnum("start_type", ["manual", "electric", "avr"]);
export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["sbp", "card", "invoice"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["issued", "paid", "cancelled"]);
export const leadTypeEnum = pgEnum("lead_type", ["quote", "master_call", "warranty", "contact"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "in_progress", "done"]);
export const warrantyStatusEnum = pgEnum("warranty_status", ["active", "expired"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  segment: segmentEnum("segment").notNull().default("b2c"),
  companyName: text("company_name"),
  inn: text("inn"),
  b2bStatus: b2bStatusEnum("b2b_status").notNull().default("none"),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoUrl: text("logo_url"),
}, (table) => ({
  slugIdx: uniqueIndex("brands_slug_idx").on(table.slug),
}));

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: generatorTypeEnum("type").notNull(),
  description: text("description"),
}, (table) => ({
  slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  brandId: integer("brand_id").references(() => brands.id),
  categoryId: integer("category_id").references(() => categories.id),
  type: generatorTypeEnum("type").notNull(),
  powerKw: numeric("power_kw", { precision: 6, scale: 2 }).notNull(),
  phases: smallint("phases").notNull().default(1),
  startType: startTypeEnum("start_type").notNull().default("manual"),
  tankL: numeric("tank_l", { precision: 6, scale: 1 }),
  fuelConsumption: numeric("fuel_consumption", { precision: 6, scale: 2 }),
  weightKg: numeric("weight_kg", { precision: 7, scale: 1 }),
  noiseDb: numeric("noise_db", { precision: 5, scale: 1 }),
  priceRetail: numeric("price_retail", { precision: 10, scale: 2 }).notNull(),
  priceWholesale: numeric("price_wholesale", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url"),
  documents: jsonb("documents").$type<{ title: string; url: string }[]>().notNull().default([]),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewsCount: integer("reviews_count").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
  typeIdx: index("products_type_idx").on(table.type),
  brandIdx: index("products_brand_id_idx").on(table.brandId),
  categoryIdx: index("products_category_id_idx").on(table.categoryId),
  stockIdx: index("products_stock_idx").on(table.stock),
  featuredIdx: index("products_featured_idx").on(table.featured),
}));

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  rating: smallint("rating").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  productCreatedIdx: index("reviews_product_created_at_idx").on(table.productId, table.createdAt),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  userId: integer("user_id").references(() => users.id),
  segment: segmentEnum("segment").notNull().default("b2c"),
  status: orderStatusEnum("status").notNull().default("new"),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address"),
  companyName: text("company_name"),
  inn: text("inn"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("card"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  comment: text("comment"),
  clientRequestId: text("client_request_id"),
  paymentProvider: text("payment_provider"),
  paymentId: text("payment_id"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  orderNumberIdx: uniqueIndex("orders_order_number_idx").on(table.orderNumber),
  clientRequestIdx: uniqueIndex("orders_client_request_id_idx").on(table.clientRequestId),
  userCreatedIdx: index("orders_user_created_at_idx").on(table.userId, table.createdAt),
  createdIdx: index("orders_created_at_idx").on(table.createdAt),
  paymentIdIdx: uniqueIndex("orders_payment_id_idx").on(table.paymentId),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  orderIdx: index("order_items_order_id_idx").on(table.orderId),
}));

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("issued"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index("invoices_order_id_idx").on(table.orderId),
}));

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  category: text("category").notNull().default("Статьи"),
  readTimeMinutes: integer("read_time_minutes").notNull().default(5),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  publishedAt: timestamp("published_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("blog_posts_slug_idx").on(table.slug),
  publishedIdx: index("blog_posts_published_at_idx").on(table.publishedAt),
}));

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  type: leadTypeEnum("type").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  companyName: text("company_name"),
  inn: text("inn"),
  comment: text("comment"),
  status: leadStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  createdIdx: index("leads_created_at_idx").on(table.createdAt),
  statusCreatedIdx: index("leads_status_created_at_idx").on(table.status, table.createdAt),
}));

export const warranties = pgTable("warranties", {
  id: serial("id").primaryKey(),
  serialNumber: text("serial_number").notNull(),
  phone: text("phone").notNull(),
  fullName: text("full_name").notNull(),
  productName: text("product_name"),
  activatedAt: timestamp("activated_at", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  status: warrantyStatusEnum("status").notNull().default("active"),
}, (table) => ({
  serialNumberIdx: uniqueIndex("warranties_serial_number_idx").on(table.serialNumber),
}));

export const diagnosticSymptoms = pgTable("diagnostic_symptoms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userProductIdx: uniqueIndex("favorites_user_product_idx").on(table.userId, table.productId),
}));
