import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Builds the Prisma driver adapter for MySQL / MariaDB from DATABASE_URL.
 *
 * DATABASE_URL uses the format the Prisma CLI expects:
 *   mysql://USER:PASSWORD@HOST:3306/DATABASE
 *
 * The URL is parsed here (instead of handing the raw string to the driver)
 * so that URL-encoded passwords (e.g. `p%40ss` for `p@ss`) work correctly.
 */
export function createMySqlAdapter(databaseUrl = process.env.DATABASE_URL ?? '') {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(databaseUrl);
  if (!['mysql:', 'mariadb:'].includes(url.protocol)) {
    throw new Error(
      `DATABASE_URL must start with mysql:// (got "${url.protocol}//")`,
    );
  }

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    connectionLimit: Number(url.searchParams.get('connection_limit') ?? 5),
    // Needed for MySQL 8 `caching_sha2_password` accounts on non-SSL connections.
    allowPublicKeyRetrieval: true,
  });
}
