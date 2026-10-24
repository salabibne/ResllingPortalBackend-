import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomPageDto } from './dto/create-custom-page.dto';
import { UpdateCustomPageDto } from './dto/update-custom-page.dto';

@Injectable()
export class CustomPagesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureReferencePages();
    } catch (err: any) {
      console.error(
        `Failed to migrate Base CMS content into custom pages: ${err?.message || err}`,
      );
    }
  }

  private escapeHtml(value?: string | null): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * One-time, idempotent move of the Base CMS blocks (Feature Cards, Our Team,
   * Founder profile/blogs/videos) into Custom Pages Builder pages. Runs on boot
   * and skips any slug that already exists, so it never overwrites edits.
   */
  private async ensureReferencePages() {
    const wanted = ['features', 'team', 'founder'];
    const existing = await this.prisma.customPage.findMany({
      where: { slug: { in: wanted } },
      select: { slug: true },
    });
    const present = new Set(existing.map((page) => page.slug));

    if (!present.has('features')) await this.createFeaturesPage();
    if (!present.has('team')) await this.createTeamPage();
    if (!present.has('founder')) await this.createFounderPage();
  }

  private async createFeaturesPage() {
    const rows = await this.prisma.cmsSection.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const heading = rows[0];

    await this.prisma.customPage.create({
      data: {
        title: 'Feature Cards',
        slug: 'features',
        content: heading
          ? `<h2>${this.escapeHtml(heading.title)}</h2><p>${this.escapeHtml(heading.description)}</p>`
          : '',
        metaTitle: heading?.title || 'Why Choose Aarham Apparel',
        metaDescription: heading?.description || 'Feature cards for Aarham Apparel',
        status: 'PUBLISHED',
        sections: {
          create: rows.map((row, index) => ({
            title: row.cardTitle,
            subtitle: 'Feature',
            description: row.cardDescription,
            imageUrl: row.imageUrl || '',
            buttonText: row.cardButton || '',
            buttonLink: row.cardLink || '#',
            sortOrder: index + 1,
            content: { type: 'feature_card', isActive: true, cardIcon: row.cardIcon || '' },
          })),
        },
      },
    });
  }

  private async createTeamPage() {
    const rows = await this.prisma.cmsTeam.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    await this.prisma.customPage.create({
      data: {
        title: 'Our Team',
        slug: 'team',
        content: '',
        metaTitle: 'Our Team - Aarham Apparel',
        metaDescription: 'The creative minds behind Aarham Apparel.',
        status: 'PUBLISHED',
        sections: {
          create: rows.map((row, index) => ({
            title: row.name,
            subtitle: row.designation || '',
            description: row.message || '',
            imageUrl: row.imageUrl || '',
            sortOrder: index + 1,
            content: { type: 'team_member', isActive: true },
          })),
        },
      },
    });
  }

  private async createFounderPage() {
    const profile = await this.prisma.cmsFounder.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    const blogs = await this.prisma.cmsFounderBlog.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const videos = await this.prisma.cmsFounderVideo.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const sections: any[] = [];
    if (profile) {
      sections.push({
        title: profile.title,
        subtitle: 'Founder',
        description: profile.description || '',
        imageUrl: profile.imageUrl || '',
        sortOrder: sections.length + 1,
        content: { type: 'founder_profile', isActive: true },
      });
    }
    blogs.forEach((row) =>
      sections.push({
        title: row.title,
        subtitle: 'Blog',
        description: row.description || '',
        imageUrl: row.imageUrl || '',
        sortOrder: sections.length + 1,
        content: { type: 'founder_blog', isActive: true },
      }),
    );
    videos.forEach((row) =>
      sections.push({
        title: row.title,
        subtitle: 'Video',
        description: row.description || '',
        imageUrl: '',
        sortOrder: sections.length + 1,
        content: { type: 'founder_video', isActive: true, videoLink: row.videoLink || '' },
      }),
    );

    await this.prisma.customPage.create({
      data: {
        title: 'Founder',
        slug: 'founder',
        content: '',
        metaTitle: 'Founder - Aarham Apparel',
        metaDescription: 'Founder profile, blogs and videos.',
        status: 'PUBLISHED',
        sections: { create: sections },
      },
    });
  }

  async findAll(query?: { search?: string; status?: string }) {
    // The site home page is managed exclusively by the Homepage Customizer
    // (GET /custom-pages/slug/home), never by the Custom Pages Builder.
    const where: any = { slug: { not: 'home' } };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customPage.findMany({
      where,
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    let item = await this.prisma.customPage.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!item && slug === 'home') {
      item = await this.seedHomePage();
    } else if (item && slug === 'home' && (!item.sections || item.sections.length === 0)) {
      await this.createDefaultHomeSections(item.id);
      item = await this.prisma.customPage.findUnique({
        where: { slug: 'home' },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }

    if (!item) {
      throw new NotFoundException(`Custom page with slug "${slug}" not found`);
    }

    return item;
  }

  async seedHomePage() {
    return this.prisma.customPage.create({
      data: {
        title: 'Home Page',
        slug: 'home',
        content: 'Main official homepage of Aarham Apparel',
        metaTitle: 'Aarham Apparel | Modern Fashion & Premium Clothing',
        metaDescription: 'Explore the finest collection of apparel and modern fashion at Aarham Apparel.',
        status: 'PUBLISHED',
        isSystem: true,
        buttonTitle: 'Shop Collection',
        buttonLink: '/shop',
        sections: {
          create: this.getDefaultHomeSectionsData(),
        },
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  private getDefaultHomeSectionsData() {
    // Features / Team / Founder are not home content any more — they live in
    // the Custom Pages Builder at /pages/features, /pages/team and /pages/founder.
    return [
      {
        title: 'Hero Banner',
        subtitle: 'Hero',
        description: 'Main promotional visual banner and call-to-actions',
        sortOrder: 1,
        content: { type: 'hero', isActive: true },
      },
      {
        title: 'New Arrivals & Featured Collection',
        subtitle: 'Products',
        description: 'Explore the latest trending outfits and premium apparel',
        buttonText: 'View All Products',
        buttonLink: '/shop',
        sortOrder: 2,
        content: { type: 'products', isActive: true, limit: 8 },
      },
      {
        title: 'Our Story & Craftsmanship',
        subtitle: 'About',
        description: 'Crafting quality fashion with passion and care',
        sortOrder: 3,
        content: { type: 'about', isActive: true },
      },
    ];
  }

  async createDefaultHomeSections(pageId: string) {
    const sectionsData = this.getDefaultHomeSectionsData();
    for (const sec of sectionsData) {
      await this.prisma.pageSection.create({
        data: {
          customPageId: pageId,
          ...sec,
        },
      });
    }
  }

  async resetHomePage() {
    let homePage = await this.prisma.customPage.findUnique({
      where: { slug: 'home' },
    });

    if (!homePage) {
      return this.seedHomePage();
    }

    // Delete existing sections and re-seed default layout
    await this.prisma.pageSection.deleteMany({
      where: { customPageId: homePage.id },
    });

    await this.createDefaultHomeSections(homePage.id);

    return this.prisma.customPage.findUnique({
      where: { id: homePage.id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.customPage.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Custom page with ID "${id}" not found`);
    }

    return item;
  }

  async create(dto: CreateCustomPageDto) {
    const slug =
      dto.slug ||
      dto.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-');

    const existing = await this.prisma.customPage.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Slug "${slug}" is already in use`);
    }

    const { id, createdAt, updatedAt, _count, sections, ...pageData } = dto;

    return this.prisma.customPage.create({
      data: {
        ...pageData,
        slug,
        sections:
          sections && sections.length > 0
            ? {
                create: sections.map((sec: any, idx: number) => ({
                  title: sec.title || '',
                  subtitle: sec.subtitle,
                  description: sec.description,
                  imageUrl: sec.imageUrl,
                  images: sec.images || [],
                  buttonText: sec.buttonText,
                  buttonLink: sec.buttonLink,
                  sortOrder: sec.sortOrder ?? idx + 1,
                  content: sec.content || {},
                })),
              }
            : undefined,
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async update(id: string, dto: UpdateCustomPageDto) {
    await this.findOne(id);
    const { id: _, createdAt, updatedAt, _count, sections, ...pageData } = dto;

    if (pageData.slug) {
      const existing = await this.prisma.customPage.findUnique({ where: { slug: pageData.slug } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Slug "${pageData.slug}" is already in use`);
      }
    }

    await this.prisma.customPage.update({
      where: { id },
      data: pageData,
    });

    if (sections) {
      await this.prisma.pageSection.deleteMany({ where: { customPageId: id } });
      if (sections.length > 0) {
        await this.prisma.pageSection.createMany({
          data: sections.map((sec: any, idx: number) => ({
            customPageId: id,
            title: sec.title || '',
            subtitle: sec.subtitle,
            description: sec.description,
            imageUrl: sec.imageUrl,
            images: sec.images || [],
            buttonText: sec.buttonText,
            buttonLink: sec.buttonLink,
            sortOrder: sec.sortOrder ?? idx + 1,
            content: sec.content || {},
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const page = await this.findOne(id);
    if (page.isSystem) {
      throw new BadRequestException('System protected pages cannot be deleted');
    }

    return this.prisma.customPage.delete({
      where: { id },
    });
  }

  // Section Management
  async addSection(pageId: string, sectionDto: any) {
    await this.findOne(pageId);
    return this.prisma.pageSection.create({
      data: {
        customPageId: pageId,
        title: sectionDto.title || '',
        subtitle: sectionDto.subtitle,
        description: sectionDto.description,
        imageUrl: sectionDto.imageUrl,
        images: sectionDto.images || [],
        buttonText: sectionDto.buttonText,
        buttonLink: sectionDto.buttonLink,
        sortOrder: sectionDto.sortOrder ?? 1,
        content: sectionDto.content || {},
      },
    });
  }

  async updateSection(sectionId: string, sectionDto: any) {
    const sec = await this.prisma.pageSection.findUnique({ where: { id: sectionId } });
    if (!sec) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    return this.prisma.pageSection.update({
      where: { id: sectionId },
      data: sectionDto,
    });
  }

  async deleteSection(sectionId: string) {
    const sec = await this.prisma.pageSection.findUnique({ where: { id: sectionId } });
    if (!sec) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`);
    }

    return this.prisma.pageSection.delete({ where: { id: sectionId } });
  }

  async reorderSections(pageId: string, sectionOrders: { id: string; sortOrder: number }[]) {
    await this.findOne(pageId);
    const updates = sectionOrders.map((item) =>
      this.prisma.pageSection.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }
}
