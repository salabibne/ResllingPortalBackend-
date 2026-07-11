# Aarham Apparel Backend

NestJS backend with Prisma and PostgreSQL.

## Setup

1. Copy `.env.example` to `.env` and adjust the values if needed.
2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and create the first migration:

```bash
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

5. Start the API:

```bash
npm run start:dev
```

## Endpoints

- `GET /` returns a basic status message.
- `GET /health` checks the database connection.
