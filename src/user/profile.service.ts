import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { getVerification } from './reseller-verification';

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  secondaryPhone: true,
  role: true,
  status: true,
  imageUrl: true,
  pageName: true,
  nidNumber: true,
  presentAddress: true,
  presentDistrict: true,
  presentThana: true,
  permanentDistrict: true,
  permanentThana: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Required DB columns that must never be blanked by a profile edit. */
const NON_NULLABLE = new Set(['name', 'presentDistrict', 'presentThana', 'permanentDistrict', 'permanentThana']);

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, verification: getVerification(user) };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, string | null> = {};

    for (const [key, raw] of Object.entries(dto)) {
      if (raw === undefined) continue;
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (!value) {
        if (NON_NULLABLE.has(key)) continue; // ignore attempts to blank required columns
        data[key] = null;
      } else {
        data[key] = value;
      }
    }

    if (data.pageName) {
      const taken = await this.prisma.user.findFirst({
        where: { pageName: data.pageName, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('এই পেজ / শপের নাম আগে থেকেই ব্যবহৃত হচ্ছে');
    }

    if (data.nidNumber) {
      const taken = await this.prisma.user.findFirst({
        where: { nidNumber: data.nidNumber, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('এই NID নম্বর দিয়ে আগে থেকেই একটি অ্যাকাউন্ট আছে');
    }

    try {
      await this.prisma.user.update({ where: { id: userId }, data: data as Prisma.UserUpdateInput });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('পেজের নাম বা NID নম্বর আগে থেকেই ব্যবহৃত হচ্ছে');
      }
      throw error;
    }

    return this.getMe(userId);
  }
}
