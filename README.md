# ⚙️ Aarham Apparel — Backend API Service

[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

The **Backend RESTful API Service** for the **Aarham Apparel Platform**. Built with **NestJS**, **Prisma ORM**, and **MySQL**, this service handles business logic, complex data modeling for dual-tier pricing, inventory audit ledgers, secure authentication, and order processing workflows.

---

## 🏛️ Module Architecture

The backend application is structured modularly under `src/`:

```text
src/
├── auth/            # JWT authentication, refresh tokens, bcrypt hashing, and RBAC guards
├── product/         # Catalog, 3-tier taxonomy, brand management, variant matrices & dual pricing
├── inventory/       # Stock tracking, stock in/out ledgers, supplier metadata & low-stock alerts
├── cart/            # Cart item calculation, promo code verification & courier charges
├── order/           # Order creation, processing state machine & payment method tracking
├── metadata/        # System configuration data (districts, thanas, lookup options)
├── prisma/          # Prisma database service module & database client injection
├── app.module.ts    # Central application root module
└── main.ts          # NestJS entry point & CORS configuration
```

---

## 🔑 Core Features & Business Logic

### 1. Authentication & Role-Based Access Control (RBAC)
- **Dual-Token System**: Short-lived Access Tokens (15m) & long-lived Refresh Tokens (7d).
- **Hashed Secrets**: Secure password hashing with `bcryptjs`.
- **7 User Roles**:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `MANAGER`
  - `SALES_EXECUTIVE`
  - `INVENTOR`
  - `RESELLER`
  - `USER`

### 2. Product Catalog & Dual-Tier Pricing
- **3-Level Hierarchy**: Category ➔ Subcategory ➔ Child Category.
- **Pricing Strategy**: Separate attributes for `purchasePrice`, `oldPrice`, `newPrice`, and wholesale `resellerPrice`.
- **Variants**: Color variants (hex code), Size variants, and Age range variants.

### 3. Inventory Ledger & Stock Auditing
- Real-time stock counts tracked per `ProductSize` combination.
- Immutable ledger logging for all stock updates (`STOCK_IN`, `STOCK_OUT`).
- Transaction purpose classifications: `SELL`, `PURCHASE`, `RETURN`, `DAMAGE`.
- Stock threshold alerts to notify inventory managers before stockouts.

### 4. Order & Cart Workflow Engine
- Cart creation per customer with automated line item subtotaling.
- Multi-status order processing: `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED` (or `CANCELLED` / `RETURNED`).
- Multi-channel payment recording: `CASH_ON_DELIVERY`, `BKASH`, `NAGAD`, `BANK_TRANSFER`.

---

## 🌐 API Route Reference

### 🔐 Auth Endpoints (`/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user | Public |
| `POST` | `/auth/login` | Authenticate with email/phone & password | Public |
| `POST` | `/auth/refresh` | Obtain new access token via refresh token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile | Authenticated |

### 📦 Product & Catalog Endpoints (`/product`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/product` | List all products with filtering & pagination | Public |
| `GET` | `/product/:id` | Get detailed product information | Public |
| `POST` | `/product` | Create a new product with variants & pricing | Admin / Manager |
| `PUT` | `/product/:id` | Update product details | Admin / Manager |
| `DELETE` | `/product/:id` | Soft-delete a product | Admin |

### 📊 Inventory Endpoints (`/inventory`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory` | Get current stock levels | Admin / Inventor |
| `POST` | `/inventory/adjust` | Record stock in/out transaction | Admin / Inventor |
| `GET` | `/inventory/transactions` | View inventory transaction audit ledger | Admin / Inventor |

### 🛒 Cart & Order Endpoints (`/cart`, `/order`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Fetch current active cart | Authenticated |
| `POST` | `/cart/items` | Add item to cart | Authenticated |
| `POST` | `/order` | Place order from active cart | Authenticated |
| `GET` | `/order` | List user or system orders | Authenticated |
| `PATCH` | `/order/:id/status` | Update order processing status | Admin / Manager |

---

## 🛠️ Environment Configuration

Create a `.env` file in the `Backend/` directory:

```env
# Database connection
DATABASE_URL="mysql://aarham:aarham@localhost:3306/aarham_apparel"

# JWT Authentication
ACCESS_TOKEN_SECRET="your_access_token_secret_key_here"
REFRESH_TOKEN_SECRET="your_refresh_token_secret_key_here"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL="7d"

# Server Port
PORT=3000
```

---

## 🚀 Getting Started & CLI Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Prisma Generation
```bash
# Run database migrations
npm run prisma:migrate:dev

# Generate Prisma Client
npm run prisma:generate

# Launch Prisma Studio GUI
npm run prisma:studio
```

### 3. Running the Backend Server
```bash
# Development mode (Watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```
Backend API will be accessible at: `http://localhost:3000`

### 4. API Write-Request Checks (Postman)
[`write_requests_postman_collection.json`](./write_requests_postman_collection.json) runs POST, PATCH and DELETE requests across categories, products, inventory, cart and orders (32 requests, 42 assertions). It also checks that cancelling an order puts its stock back.

> ⚠️ It creates users, products and orders, cancels an order and deactivates categories. Run it against a **local or test database only**, never production.

```bash
# 1. Create the test admin (admin@example.com) used by the collection
npx ts-node scratch-create-admin.ts

# 2. Start the API (see step 3), then run the collection
postman collection run write_requests_postman_collection.json -e local_postman_environment.json
```
[`local_postman_environment.json`](./local_postman_environment.json) points at `http://localhost:3000` and holds the local test admin's login. A run passes when the exit code is `0`. You can also import both files into the Postman app and use the Collection Runner.

---

## ☁️ Render Deployment

This repo ships with a [`render.yaml`](./render.yaml) Blueprint that deploys a **Node web service** and connects it to an external **MySQL / MariaDB** database (Render has no managed MySQL, so use your hosting provider's MySQL, e.g. cPanel + phpMyAdmin).

1. Push the repo to GitHub, then in the Render Dashboard choose **New → Blueprint** and select the repository.
2. On sync, Render prompts for the values marked `sync: false`. Paste them in the dashboard — they are stored as encrypted secrets and are **never** committed to the repo:
   - `DATABASE_URL` — the MySQL connection string, `mysql://USER:PASSWORD@HOST:3306/DATABASE`. On shared hosting, allow the Render server under **Remote MySQL** first.
   - `FRONTEND_URL` — the deployed frontend origin used for CORS.
   - `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY` — courier credentials (optional at first boot).
3. `PORT` is provided by Render; the JWT secrets are generated automatically.

> The database must accept connections from Render's outbound IPs. Supply the URL through `sync` (dashboard) rather than hardcoding it in the Blueprint.

**How it runs**
- Build: `npm ci --include=dev && npm run build` (installs dev deps, generates Prisma Client, compiles Nest).
- Start: `npm run prisma:migrate:deploy && npm run start:prod` — migrations run on every deploy, then `node dist/src/main`.
- Health check: `/health` (verifies database connectivity).

> The compiled entry point is `dist/src/main.js` because the generated Prisma Client lives outside `src/`. Keep the start command in sync if the build layout changes.
