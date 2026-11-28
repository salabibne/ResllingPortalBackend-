import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CommonStatus, UserRole } from '../../../prisma/generated/client';

export const ACCOUNT_PENDING_MESSAGE =
  'আপনার উদ্যোক্তা অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুমোদনের পর কার্টে যোগ ও অর্ডার করতে পারবেন।';

/**
 * Pending resellers may sign in and browse, but must not add to cart, place
 * orders or request withdrawals until an admin approves them (status ACTIVE).
 * Must run after JwtAccessGuard, which puts the fresh user on `req.user`.
 */
@Injectable()
export class ActiveResellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;

    if (
      user?.role === UserRole.RESELLER &&
      user?.status !== CommonStatus.ACTIVE
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ACCOUNT_PENDING',
        message: ACCOUNT_PENDING_MESSAGE,
      });
    }

    return true;
  }
}
