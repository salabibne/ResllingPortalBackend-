# ⚙️ Aarham Apparel — Backend API Service

[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

The **Backend RESTful API Service** for the **Aarham Apparel Platform**. Built with **NestJS**, **Prisma ORM**, and **PostgreSQL**, this service handles business logic, complex data modeling for dual-tier pricing, inventory audit ledgers, secure authentication, and order processing workflows.

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
DATABASE_URL="postgresql://postgres:password@localhost:5432/aarham_apparel?schema=public"

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
