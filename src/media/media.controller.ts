import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { UserRole } from '../../prisma/generated/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaService } from './media.service';

const MEDIA_WRITE_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MEDIA_WRITE_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async upload(@UploadedFile() file?: UploadedImage) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file was uploaded');
    }

    this.mediaService.assertImage(file.mimetype);

    const extension =
      EXTENSION_BY_MIME[file.mimetype] ||
      extname(file.originalname || '').toLowerCase() ||
      '.png';
    const storedName = `${randomUUID()}${extension}`;
    const directory = join(process.cwd(), 'uploads');

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, storedName), file.buffer);

    return this.mediaService.record({
      url: `/uploads/${storedName}`,
      filename: file.originalname || storedName,
      mimeType: file.mimetype,
      size: file.size ?? file.buffer.length,
    });
  }

  @Get()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(...MEDIA_WRITE_ROLES)
  list(@Query('limit') limit?: string) {
    return this.mediaService.list(limit ? Number(limit) : 50);
  }
}
