import { Prisma } from '../../prisma/generated/client';

/**
 * Re-runs a transaction when the database aborts it because of a write
 * conflict or deadlock (Prisma error P2034).
 *
 * MySQL/InnoDB implements SERIALIZABLE with locks, so two requests that touch
 * the same row at the same moment often deadlock; one of them is rolled back
 * and simply needs to be tried again.
 */
export async function withTransactionRetry<T>(
  run: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034';
      if (!retryable || attempt >= maxAttempts) throw error;
      // Small randomised back-off so competing requests don't collide again.
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 50));
    }
  }
}
