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
- `POST /auth/register` creates a user and returns access and refresh tokens.
- `POST /auth/login` authenticates with email or phone and returns tokens.
- `POST /auth/refresh` exchanges a valid refresh token for a new token pair.
- `GET /auth/me` returns the authenticated user profile.

## Auth Environment Variables

- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL` defaults to `15m`
- `REFRESH_TOKEN_TTL` defaults to `7d`
