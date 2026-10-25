import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommonStatus, PageStatus, Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto, ReorderSectionsDto, UpdateSectionDto } from './dto/section.dto';
import {
  HomepageSectionType,
  SECTION_REGISTRY,
  getFactorySections,
  isSectionType,
  mergeSettings,
  resolveVariant,
  sanitizeUrl,
} from './section-registry';

const HOME_SLUG = 'home';
const MAX_PRODUCTS = 200;

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

export interface HomepageSectionDto {
  id: string;
  type: HomepageSectionType;
  variant: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageDescription: string;
  buttonText: string;
  buttonLink: string;
  settings: Record<string, unknown>;
  isEnabled: boolean;
  sortOrder: number;
}

interface PageSectionRow {
  id: string;
  customPageId: string;
  type: string | null;
  variant: string | null;
  settings: unknown;
  isEnabled: boolean;
  status: PageStatus;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  imageDescription: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  content: unknown;
  sortOrder: number;
}

/** Maps legacy `content.type` values onto registry types. */
function normalizeType(type: string | null | undefined): HomepageSectionType {
  const value = (type ?? '').toLowerCase();
  if (isSectionType(value)) return value;
  switch (value) {
    case 'hero_banner':
      return 'hero';
    case 'product':
      return 'products';
    case 'about':
      return 'story';
    case 'feature':
    case 'features':
      return 'trust';
    default:
      return 'banner';
  }
}

@Injectable()
export class HomepageService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── PAGE ─────────────────────────────────────────────────────────────

  private async findHomePage() {
    return this.prisma.customPage.findUnique({ where: { slug: HOME_SLUG } });
  }

  /**
   * Lazily creates the home page row. Uses the unique slug to stay idempotent
   * if another module seeds it at the same time.
   */
  async ensureHomePage() {
    const existing = await this.findHomePage();
    if (existing) return existing;

    const factory = getFactorySections();

    try {
      return await this.prisma.customPage.create({
        data: {
          title: 'Home Page',
          slug: HOME_SLUG,
          content: 'Main official homepage',
          metaTitle: 'Aarham Apparel | Modern Fashion & Premium Clothing',
          metaDescription:
            'Explore the finest collection of apparel and modern fashion at Aarham Apparel.',
          status: PageStatus.PUBLISHED,
          isSystem: true,
          buttonTitle: 'Shop Collection',
          buttonLink: '/shop',
          sections: {
            create: factory.map((section) => ({
              type: section.type,
              variant: section.variant,
              title: section.title,
              subtitle: section.subtitle,
              description: section.description,
              imageUrl: section.imageUrl,
              buttonText: section.buttonText,
              buttonLink: section.buttonLink,
              settings: section.settings as Prisma.InputJsonValue,
              isEnabled: true,
              status: PageStatus.PUBLISHED,
              sortOrder: section.sortOrder,
              content: { type: section.type, isActive: true },
            })),
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const page = await this.findHomePage();
        if (page) return page;
      }
      throw error;
    }
  }

  // ─── PUBLIC ───────────────────────────────────────────────────────────

  async getPublic() {
    const page = await this.ensureHomePage();

    const rows = await this.prisma.pageSection.findMany({
      where: {
        customPageId: page.id,
        status: PageStatus.PUBLISHED,
        isEnabled: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const sections = rows.map((row) => this.toDto(row as PageSectionRow));
    const resources = await this.resolveResources(sections);

    return {
      page: { id: page.id, title: page.title, slug: page.slug, updatedAt: page.updatedAt },
      sections,
      resources,
    };
  }

  // ─── ADMIN (draft workspace) ──────────────────────────────────────────

  async getAdmin() {
    const page = await this.ensureHomePage();
    const drafts = await this.ensureDraftSet(page.id);

    const published = await this.prisma.pageSection.findMany({
      where: { customPageId: page.id, status: PageStatus.PUBLISHED },
      orderBy: { sortOrder: 'asc' },
    });

    const sections = drafts.map((row) => this.toDto(row as PageSectionRow));
    const resources = await this.resolveResources(sections);

    return {
      page: { id: page.id, title: page.title, slug: page.slug, updatedAt: page.updatedAt },
      sections,
      resources,
      hasUnpublishedChanges: this.hasChanges(drafts, published),
    };
  }

  async createSection(dto: CreateSectionDto) {
    const page = await this.ensureHomePage();
    await this.ensureDraftSet(page.id);

    const type = normalizeType(dto.type);
    const definition = SECTION_REGISTRY[type];
    const variant = resolveVariant(type, dto.variant);

    const max = await this.prisma.pageSection.aggregate({
      where: { customPageId: page.id, status: PageStatus.DRAFT },
      _max: { sortOrder: true },
    });

    return this.prisma.pageSection.create({
      data: {
        customPageId: page.id,
        status: PageStatus.DRAFT,
        type,
        variant,
        title: (dto.title ?? definition.defaults.title).slice(0, 200),
        subtitle: (dto.subtitle ?? definition.defaults.subtitle ?? '').slice(0, 200),
        description: (dto.description ?? definition.defaults.description ?? '').slice(0, 2000),
        imageUrl: sanitizeUrl(dto.imageUrl ?? definition.defaults.imageUrl),
        imageDescription: dto.imageDescription?.slice(0, 300),
        buttonText: (dto.buttonText ?? definition.defaults.buttonText ?? '').slice(0, 100),
        buttonLink: sanitizeUrl(dto.buttonLink ?? definition.defaults.buttonLink),
        settings: mergeSettings(type, variant, dto.settings) as Prisma.InputJsonValue,
        isEnabled: dto.isEnabled ?? true,
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
        content: { type, isActive: dto.isEnabled ?? true },
      },
    });
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    const page = await this.ensureHomePage();
    const existing = await this.prisma.pageSection.findUnique({ where: { id } });

    if (!existing || existing.customPageId !== page.id) {
      throw new NotFoundException(`Homepage section "${id}" not found`);
    }

    if (existing.status !== PageStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft sections can be edited. Reload the builder to create a draft.',
      );
    }

    const type = normalizeType(existing.type);
    const variant =
      dto.variant !== undefined
        ? resolveVariant(type, dto.variant)
        : resolveVariant(type, existing.variant);

    const settingsSource = {
      ...((existing.settings as Record<string, unknown>) ?? {}),
      ...(dto.settings ?? {}),
    };

    const data: Prisma.PageSectionUpdateInput = {
      type,
      variant,
      settings: mergeSettings(type, variant, settingsSource) as Prisma.InputJsonValue,
    };

    if (dto.title !== undefined) data.title = dto.title.slice(0, 200);
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle.slice(0, 200);
    if (dto.description !== undefined) data.description = dto.description.slice(0, 2000);
    if (dto.imageUrl !== undefined) data.imageUrl = sanitizeUrl(dto.imageUrl);
    if (dto.imageDescription !== undefined) {
      data.imageDescription = dto.imageDescription.slice(0, 300);
    }
    if (dto.buttonText !== undefined) data.buttonText = dto.buttonText.slice(0, 100);
    if (dto.buttonLink !== undefined) data.buttonLink = sanitizeUrl(dto.buttonLink);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isEnabled !== undefined) {
      data.isEnabled = dto.isEnabled;
      data.content = {
        ...((existing.content as Record<string, unknown>) ?? {}),
        type,
        isActive: dto.isEnabled,
      };
    }

    return this.prisma.pageSection.update({ where: { id }, data });
  }

  async deleteSection(id: string) {
    const page = await this.ensureHomePage();
    const existing = await this.prisma.pageSection.findUnique({ where: { id } });

    if (!existing || existing.customPageId !== page.id) {
      throw new NotFoundException(`Homepage section "${id}" not found`);
    }

    if (existing.status !== PageStatus.DRAFT) {
      throw new BadRequestException('Only draft sections can be deleted');
    }

    await this.prisma.pageSection.delete({ where: { id } });
    return { success: true };
  }

  async duplicateSection(id: string) {
    const page = await this.ensureHomePage();
    const existing = await this.prisma.pageSection.findUnique({ where: { id } });

    if (!existing || existing.customPageId !== page.id) {
      throw new NotFoundException(`Homepage section "${id}" not found`);
    }

    const max = await this.prisma.pageSection.aggregate({
      where: { customPageId: page.id, status: PageStatus.DRAFT },
      _max: { sortOrder: true },
    });

    return this.prisma.pageSection.create({
      data: {
        customPageId: page.id,
        status: PageStatus.DRAFT,
        type: existing.type,
        variant: existing.variant,
        title: `${existing.title ?? 'Section'} (Copy)`.slice(0, 200),
        subtitle: existing.subtitle,
        description: existing.description,
        imageUrl: existing.imageUrl,
        images: existing.images,
        imageDescription: existing.imageDescription,
        buttonText: existing.buttonText,
        buttonLink: existing.buttonLink,
        settings: (existing.settings ?? {}) as Prisma.InputJsonValue,
        isEnabled: existing.isEnabled,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        content: (existing.content ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async reorderSections(dto: ReorderSectionsDto) {
    const page = await this.ensureHomePage();
    const ids = dto.sectionOrders.map((item) => item.id);

    const owned = await this.prisma.pageSection.findMany({
      where: { id: { in: ids }, customPageId: page.id, status: PageStatus.DRAFT },
      select: { id: true },
    });

    if (owned.length !== ids.length) {
      throw new BadRequestException('One or more sections are not editable drafts');
    }

    await this.prisma.$transaction(
      dto.sectionOrders.map((item) =>
        this.prisma.pageSection.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { success: true };
  }

  async publish() {
    const page = await this.ensureHomePage();

    const result = await this.prisma.$transaction(async (tx) => {
      const drafts = await tx.pageSection.findMany({
        where: { customPageId: page.id, status: PageStatus.DRAFT },
        orderBy: { sortOrder: 'asc' },
      });

      if (!drafts.length) {
        throw new BadRequestException('There are no draft sections to publish');
      }

      await tx.pageSection.deleteMany({
        where: { customPageId: page.id, status: PageStatus.PUBLISHED },
      });

      await tx.pageSection.createMany({
        data: drafts.map((draft) => ({
          customPageId: page.id,
          status: PageStatus.PUBLISHED,
          type: draft.type,
          variant: draft.variant,
          title: draft.title,
          subtitle: draft.subtitle,
          description: draft.description,
          imageUrl: draft.imageUrl,
          images: draft.images,
          imageDescription: draft.imageDescription,
          buttonText: draft.buttonText,
          buttonLink: draft.buttonLink,
          settings: (draft.settings ?? {}) as Prisma.InputJsonValue,
          isEnabled: draft.isEnabled,
          sortOrder: draft.sortOrder,
          content: (draft.content ?? {}) as Prisma.InputJsonValue,
        })),
      });

      await tx.pageSection.deleteMany({
        where: { customPageId: page.id, status: PageStatus.DRAFT },
      });

      await tx.customPage.update({
        where: { id: page.id },
        data: { updatedAt: new Date() },
      });

      return { published: drafts.length };
    });

    return { success: true, ...result, publishedAt: new Date().toISOString() };
  }

  async discard() {
    const page = await this.ensureHomePage();
    await this.prisma.pageSection.deleteMany({
      where: { customPageId: page.id, status: PageStatus.DRAFT },
    });
    return { success: true };
  }

  async reset() {
    const page = await this.ensureHomePage();
    const factory = getFactorySections();

    await this.prisma.$transaction(async (tx) => {
      await tx.pageSection.deleteMany({
        where: { customPageId: page.id, status: PageStatus.DRAFT },
      });

      await tx.pageSection.createMany({
        data: factory.map((section) => ({
          customPageId: page.id,
          status: PageStatus.DRAFT,
          type: section.type,
          variant: section.variant,
          title: section.title,
          subtitle: section.subtitle,
          description: section.description,
          imageUrl: section.imageUrl,
          buttonText: section.buttonText,
          buttonLink: section.buttonLink,
          settings: section.settings as Prisma.InputJsonValue,
          isEnabled: true,
          sortOrder: section.sortOrder,
          content: { type: section.type, isActive: true },
        })),
      });
    });

    return this.getAdmin();
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────

  /**
   * Guarantees a DRAFT working copy exists. The first admin load clones the
   * published rows so the builder never mutates live content directly.
   */
  private async ensureDraftSet(pageId: string) {
    const drafts = await this.prisma.pageSection.findMany({
      where: { customPageId: pageId, status: PageStatus.DRAFT },
      orderBy: { sortOrder: 'asc' },
    });

    if (drafts.length) return drafts;

    const published = await this.prisma.pageSection.findMany({
      where: { customPageId: pageId, status: PageStatus.PUBLISHED },
      orderBy: { sortOrder: 'asc' },
    });

    if (!published.length) return [];

    await this.prisma.pageSection.createMany({
      data: published.map((row) => ({
        customPageId: pageId,
        status: PageStatus.DRAFT,
        type: row.type,
        variant: row.variant,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        imageUrl: row.imageUrl,
        images: row.images,
        imageDescription: row.imageDescription,
        buttonText: row.buttonText,
        buttonLink: row.buttonLink,
        settings: (row.settings ?? {}) as Prisma.InputJsonValue,
        isEnabled: row.isEnabled,
        sortOrder: row.sortOrder,
        content: (row.content ?? {}) as Prisma.InputJsonValue,
      })),
    });

    return this.prisma.pageSection.findMany({
      where: { customPageId: pageId, status: PageStatus.DRAFT },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private hasChanges(drafts: PageSectionRow[], published: Array<Record<string, unknown>>) {
    const normalize = (rows: Array<Record<string, unknown>>) =>
      JSON.stringify(
        [...rows]
          .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
          .map((row) => ({
            type: row.type,
            variant: row.variant,
            title: row.title,
            subtitle: row.subtitle,
            description: row.description,
            imageUrl: row.imageUrl,
            imageDescription: row.imageDescription,
            buttonText: row.buttonText,
            buttonLink: row.buttonLink,
            settings: row.settings,
            isEnabled: row.isEnabled,
            sortOrder: row.sortOrder,
          })),
      );

    return normalize(drafts as unknown as Array<Record<string, unknown>>) !== normalize(published);
  }

  private toDto(row: PageSectionRow): HomepageSectionDto {
    const type = normalizeType(row.type);
    const variant = resolveVariant(type, row.variant);

    return {
      id: row.id,
      type,
      variant,
      title: row.title ?? '',
      subtitle: row.subtitle ?? '',
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? '',
      imageDescription: row.imageDescription ?? '',
      buttonText: row.buttonText ?? '',
      buttonLink: row.buttonLink ?? '',
      settings: mergeSettings(type, variant, row.settings),
      isEnabled: row.isEnabled,
      sortOrder: row.sortOrder,
    };
  }

  /**
   * Resolves every product/category/logo reference in one pass so the public
   * page never issues one request per section.
   */
  private async resolveResources(sections: HomepageSectionDto[]) {
    const productSections = sections.filter((section) => section.type === 'products');
    const categorySections = sections.filter((section) => section.type === 'categories');
    const logoSection = sections.find((section) => section.type === 'logos');

    const products: Record<string, unknown[]> = {};

    // The admin editor needs these lists even before a source is chosen, so
    // fetch them whenever the page contains a section that could reference them.
    const needsProductBrands = productSections.length > 0;
    const needsCategories = categorySections.length > 0 || productSections.length > 0;

    const [categories, brands, productBrands] = await Promise.all([
      needsCategories
        ? this.prisma.category.findMany({
            where: { status: CommonStatus.ACTIVE },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
      logoSection
        ? this.prisma.cmsBrand.findMany({
            where: { status: CommonStatus.ACTIVE },
            orderBy: { createdAt: 'asc' },
            take: Math.min(Number(logoSection.settings.limit ?? 12), 24),
          })
        : Promise.resolve([]),
      needsProductBrands
        ? this.prisma.brand.findMany({
            where: { status: CommonStatus.ACTIVE },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    if (productSections.length) {
      const needsCatalogue = productSections.some(
        (section) => section.settings.productSource !== 'manual',
      );

      const catalogue = needsCatalogue
        ? await this.prisma.product.findMany({
            where: { deletedAt: null, status: CommonStatus.ACTIVE },
            include: PRODUCT_INCLUDE,
            orderBy: { createdAt: 'desc' },
            take: MAX_PRODUCTS,
          })
        : [];

      const manualIds = Array.from(
        new Set(
          productSections
            .filter((section) => section.settings.productSource === 'manual')
            .flatMap((section) => (section.settings.productIds as string[]) ?? []),
        ),
      );

      const manualProducts = manualIds.length
        ? await this.prisma.product.findMany({
            where: {
              id: { in: manualIds },
              deletedAt: null,
              status: CommonStatus.ACTIVE,
            },
            include: PRODUCT_INCLUDE,
          })
        : [];

      const manualMap = new Map(manualProducts.map((product) => [product.id, product]));

      for (const section of productSections) {
        const limit = Math.min(Math.max(Number(section.settings.limit ?? 8), 1), 24);
        const source = String(section.settings.productSource ?? 'new');

        let list: typeof catalogue = [];

        if (source === 'manual') {
          const ids = (section.settings.productIds as string[]) ?? [];
          list = ids
            .map((productId) => manualMap.get(productId))
            .filter(
              (product): product is (typeof manualProducts)[number] => !!product,
            );
        } else if (source === 'discount') {
          list = catalogue.filter(
            (product) => Number(product.oldPrice) > Number(product.newPrice),
          );
        } else if (source === 'category') {
          const ids = (section.settings.categoryIds as string[]) ?? [];
          list = ids.length
            ? catalogue.filter((product) => ids.includes(product.categoryId))
            : catalogue;
        } else if (source === 'brand') {
          const ids = (section.settings.brandIds as string[]) ?? [];
          list = ids.length
            ? catalogue.filter((product) => ids.includes(product.brandId))
            : [];
        } else {
          list = catalogue.filter((product) => product.showAsNewArrival);
        }

        products[section.id] = list.slice(0, limit);
      }
    }

    return { products, categories, brands, productBrands };
  }
}
