import {
  HomepageSectionType,
  isSectionType,
  mergeSettings,
  resolveVariant,
  sanitizeUrl,
} from './section-registry';

/**
 * Sections written by the old Custom Pages editor have no `type`; their kind
 * lives in `content.type` (feature_card, team_member, founder_*). This turns
 * them into builder sections the first time a page is opened in the builder.
 * Rows that already have a `type` pass through unchanged.
 */

export interface LegacyRow {
  type: string | null;
  variant: string | null;
  settings: unknown;
  isEnabled: boolean;
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

export interface ConvertedSection {
  type: string | null;
  variant: string | null;
  settings: unknown;
  isEnabled: boolean;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  imageDescription: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  content: unknown;
}

/** Legacy kinds shown as a grid of cards; each run becomes promotion cards. */
const CARD_KINDS = new Set(['feature_card', 'team_member', 'founder_blog']);
/** A three-column promotion section looks like the old three-column grid. */
const CARDS_PER_SECTION = 3;

function legacyKind(row: LegacyRow): string {
  const content = (row.content ?? {}) as Record<string, unknown>;
  return String(content.type ?? '').toLowerCase();
}

function legacyType(kind: string): HomepageSectionType {
  if (isSectionType(kind)) return kind;
  if (kind === 'hero_banner') return 'hero';
  if (kind === 'product') return 'products';
  if (kind === 'about') return 'story';
  return 'banner';
}

function section(
  type: HomepageSectionType,
  variant: string | undefined,
  fields: Partial<ConvertedSection>,
  settings: Record<string, unknown>,
  isEnabled: boolean,
): ConvertedSection {
  const resolved = resolveVariant(type, variant);
  return {
    type,
    variant: resolved,
    settings: mergeSettings(type, resolved, settings),
    isEnabled,
    title: fields.title ?? '',
    subtitle: fields.subtitle ?? '',
    description: fields.description ?? '',
    imageUrl: sanitizeUrl(fields.imageUrl) ?? null,
    images: [],
    imageDescription: fields.imageDescription ?? null,
    buttonText: fields.buttonText ?? '',
    buttonLink: sanitizeUrl(fields.buttonLink) ?? null,
    content: { type, isActive: isEnabled },
  };
}

function toCard(kind: string, row: LegacyRow): Record<string, unknown> {
  const content = (row.content ?? {}) as Record<string, unknown>;
  if (kind === 'feature_card') {
    return {
      title: row.title ?? '',
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? undefined,
      buttonText: row.buttonText ?? undefined,
      buttonLink: row.buttonLink && row.buttonLink !== '#' ? row.buttonLink : undefined,
      icon: typeof content.cardIcon === 'string' ? content.cardIcon : undefined,
    };
  }
  // Team members and blog posts: photo, name/title, role/label, text.
  return {
    title: row.title ?? '',
    eyebrow: row.subtitle || undefined,
    description: row.description ?? '',
    imageUrl: row.imageUrl ?? undefined,
  };
}

export function hasLegacyRows(rows: LegacyRow[]): boolean {
  return rows.some((row) => !row.type);
}

export function convertLegacyRows(rows: LegacyRow[]): ConvertedSection[] {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const out: ConvertedSection[] = [];

  for (let index = 0; index < sorted.length; ) {
    const row = sorted[index];

    if (row.type) {
      out.push({
        type: row.type,
        variant: row.variant,
        settings: row.settings ?? {},
        isEnabled: row.isEnabled,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        imageUrl: row.imageUrl,
        images: row.images,
        imageDescription: row.imageDescription,
        buttonText: row.buttonText,
        buttonLink: row.buttonLink,
        content: row.content ?? {},
      });
      index += 1;
      continue;
    }

    const kind = legacyKind(row);

    if (CARD_KINDS.has(kind)) {
      const run: LegacyRow[] = [];
      while (index < sorted.length && !sorted[index].type && legacyKind(sorted[index]) === kind) {
        run.push(sorted[index]);
        index += 1;
      }
      for (let start = 0; start < run.length; start += CARDS_PER_SECTION) {
        const chunk = run.slice(start, start + CARDS_PER_SECTION);
        out.push(
          section(
            'promotion',
            'three-columns',
            {},
            { columns: CARDS_PER_SECTION, cards: chunk.map((item) => toCard(kind, item)) },
            chunk.some((item) => item.isEnabled),
          ),
        );
      }
      continue;
    }

    index += 1;

    if (kind === 'founder_profile') {
      out.push(
        section(
          'story',
          'image-left',
          {
            title: row.title ?? '',
            subtitle: row.subtitle ?? '',
            description: row.description ?? '',
            imageUrl: row.imageUrl ?? undefined,
          },
          {},
          row.isEnabled,
        ),
      );
      continue;
    }

    if (kind === 'founder_video') {
      // No video section yet: keep the copy and link the button to the video.
      const content = (row.content ?? {}) as Record<string, unknown>;
      const videoLink = typeof content.videoLink === 'string' ? content.videoLink : '';
      out.push(
        section(
          'banner',
          'default',
          {
            title: row.title ?? '',
            subtitle: row.subtitle ?? '',
            description: row.description ?? '',
            buttonText: videoLink ? 'Watch video' : '',
            buttonLink: videoLink || undefined,
          },
          {},
          row.isEnabled,
        ),
      );
      continue;
    }

    const type = legacyType(kind);
    out.push(
      section(
        type,
        undefined,
        {
          title: row.title ?? '',
          subtitle: row.subtitle ?? '',
          description: row.description ?? '',
          imageUrl: row.imageUrl ?? undefined,
          imageDescription: row.imageDescription ?? undefined,
          buttonText: row.buttonText ?? '',
          buttonLink: row.buttonLink ?? undefined,
        },
        {},
        row.isEnabled,
      ),
    );
  }

  return out;
}
