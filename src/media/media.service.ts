import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StoredUpload {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async record(upload: StoredUpload) {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        url: upload.url,
        filename: upload.filename,
        mimeType: upload.mimeType,
        size: upload.size,
      },
    });

    return { id: asset.id, url: asset.url, filename: asset.filename };
  }

  async list(limit = 50) {
    const assets = await this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      createdAt: asset.createdAt,
    }));
  }

  assertImage(mimeType: string) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(mimeType)) {
      throw new BadRequestException(
        'Only PNG, JPEG, WebP and GIF images can be uploaded',
      );
    }
  }
}
