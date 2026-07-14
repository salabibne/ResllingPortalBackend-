import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Shared include clause for consistent product response shape */
const PRODUCT_INCLUDE = {
  category: true,
  subcategory: true,
  childCategory: true,
  brand: true,
  images: true,
  colors: { include: { color: true } },
  sizes: { include: { size: true } },
  ages: { include: { ageVariant: true } },
  inventories: { include: { productSize: { include: { size: true } } } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create core product
        const product = await tx.product.create({
          data: {
            name: dto.name,
            categoryId: dto.categoryId,
            subcategoryId: dto.subcategoryId,
            childCategoryId: dto.childCategoryId,
            brandId: dto.brandId,
            purchasePrice: dto.purchasePrice,
            oldPrice: dto.oldPrice,
            newPrice: dto.newPrice,
            resellerPrice: dto.resellerPrice,
            videoUrl: dto.videoUrl,
            unit: dto.unit,
            description: dto.description,
            status: dto.status,
            showAsNewArrival: dto.showAsNewArrival,
          },
        });

        // 2. Create product images
        if (dto.images?.length) {
          await tx.productImage.createMany({
            data: dto.images.map((img) => ({
              productId: product.id,
              imageUrl: img.imageUrl,
              isPrimary: img.isPrimary ?? false,
            })),
          });
        }

        // 3. Create color variant links
        if (dto.colorIds?.length) {
          await tx.productColor.createMany({
            data: dto.colorIds.map((colorId) => ({
              productId: product.id,
              colorId,
            })),
          });
        }

        // 4. Create size variant links
        if (dto.sizeIds?.length) {
          await tx.productSize.createMany({
            data: dto.sizeIds.map((sizeId) => ({
              productId: product.id,
              sizeId,
            })),
          });
        }

        // 5. Create age variant links
        if (dto.ageVariantIds?.length) {
          await tx.productAge.createMany({
            data: dto.ageVariantIds.map((ageVariantId) => ({
              productId: product.id,
              ageVariantId,
            })),
          });
        }

        // 6. Auto-initialize inventory records (one per size, or one with null size)
        if (dto.sizeIds?.length) {
          for (const sId of dto.sizeIds) {
            const productSize = await tx.productSize.findUnique({
              where: { productId_sizeId: { productId: product.id, sizeId: sId } },
            });
            await tx.inventory.create({
              data: {
                productId: product.id,
                productSizeId: productSize!.id,
                currentStock: 0,
                costPerUnit: 0,
                supplierName: dto.supplierName ?? 'N/A',
                supplierMobile: dto.supplierMobile ?? 'N/A',
                stockLimitAlert: dto.stockLimitAlert ?? 10,
              },
            });
          }
        } else {
          await tx.inventory.create({
            data: {
              productId: product.id,
              productSizeId: null,
              currentStock: 0,
              costPerUnit: 0,
              supplierName: dto.supplierName ?? 'N/A',
              supplierMobile: dto.supplierMobile ?? 'N/A',
              stockLimitAlert: dto.stockLimitAlert ?? 10,
            },
          });
        }

        // 7. Return fully-hydrated product
        return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: PRODUCT_INCLUDE,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create product. Transaction rolled back.',
      );
    }
  }

  // ─── READ ────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  // ─── UPDATE (relation diffing) ──────────────────────────────────────

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // --- Image replacement strategy (full swap) ---
      if (dto.images !== undefined) {
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        if (dto.images.length) {
          await tx.productImage.createMany({
            data: dto.images.map((img) => ({
              productId: id,
              imageUrl: img.imageUrl,
              isPrimary: img.isPrimary ?? false,
            })),
          });
        }
      }

      // --- Color diff ---
      if (dto.colorIds !== undefined) {
        const existingColorIds = existing.colors.map((c) => c.colorId);
        const { toAdd, toRemove } = this.diffIds(existingColorIds, dto.colorIds);

        if (toRemove.length) {
          await tx.productColor.deleteMany({
            where: { productId: id, colorId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.productColor.createMany({
            data: toAdd.map((colorId) => ({ productId: id, colorId })),
          });
        }
      }

      // --- Size diff ---
      if (dto.sizeIds !== undefined) {
        const existingSizeIds = existing.sizes.map((s) => s.sizeId);
        const { toAdd, toRemove } = this.diffIds(existingSizeIds, dto.sizeIds);

        if (toRemove.length) {
          await tx.productSize.deleteMany({
            where: { productId: id, sizeId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.productSize.createMany({
            data: toAdd.map((sizeId) => ({ productId: id, sizeId })),
          });

          // Auto-create inventory records for newly added sizes
          for (const sizeId of toAdd) {
            const productSize = await tx.productSize.findUnique({
              where: { productId_sizeId: { productId: id, sizeId } },
            });
            if (productSize) {
              const existingInv = await tx.inventory.findUnique({
                where: { productId_productSizeId: { productId: id, productSizeId: productSize.id } },
              });
              if (!existingInv) {
                // Copy supplier info from the first existing inventory record
                const firstInv = await tx.inventory.findFirst({
                  where: { productId: id },
                });
                await tx.inventory.create({
                  data: {
                    productId: id,
                    productSizeId: productSize.id,
                    currentStock: 0,
                    costPerUnit: 0,
                    supplierName: firstInv?.supplierName ?? 'N/A',
                    supplierMobile: firstInv?.supplierMobile ?? 'N/A',
                    stockLimitAlert: firstInv?.stockLimitAlert ?? 10,
                  },
                });
              }
            }
          }
        }
      }

      // --- AgeVariant diff ---
      if (dto.ageVariantIds !== undefined) {
        const existingAgeIds = existing.ages.map((a) => a.ageVariantId);
        const { toAdd, toRemove } = this.diffIds(existingAgeIds, dto.ageVariantIds);

        if (toRemove.length) {
          await tx.productAge.deleteMany({
            where: { productId: id, ageVariantId: { in: toRemove } },
          });
        }
        if (toAdd.length) {
          await tx.productAge.createMany({
            data: toAdd.map((ageVariantId) => ({ productId: id, ageVariantId })),
          });
        }
      }

      // --- Update core product scalar fields ---
      const {
        images: _images,
        colorIds: _colorIds,
        sizeIds: _sizeIds,
        ageVariantIds: _ageVariantIds,
        ...scalarFields
      } = dto;

      // Only update if there are scalar fields to change
      if (Object.keys(scalarFields).length > 0) {
        await tx.product.update({
          where: { id },
          data: scalarFields,
        });
      }

      // Return fully-hydrated result
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  // ─── SOFT DELETE ────────────────────────────────────────────────────

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────────

  /**
   * Computes the diff between existing IDs and incoming IDs.
   * Returns sets of IDs to add and IDs to remove.
   */
  private diffIds(
    existing: string[],
    incoming: string[],
  ): { toAdd: string[]; toRemove: string[] } {
    const existingSet = new Set(existing);
    const incomingSet = new Set(incoming);

    const toAdd = incoming.filter((id) => !existingSet.has(id));
    const toRemove = existing.filter((id) => !incomingSet.has(id));

    return { toAdd, toRemove };
  }
}
