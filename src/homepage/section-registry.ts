/**
 * Homepage section registry.
 *
 * Single source of truth for the section types/variants the builder accepts and
 * for the settings each type is allowed to store. Every write is sanitised
 * against this map so arbitrary JSON can never reach the database.
 */

export type HomepageSectionType =
  | 'hero'
  | 'categories'
  | 'products'
  | 'promotion'
  | 'story'
  | 'trust'
  | 'testimonials'
  | 'logos'
  | 'faq'
  | 'banner';

export type FieldKind =
  | 'string'
  | 'text'
  | 'url'
  | 'color'
  | 'int'
  | 'bool'
  | 'enum'
  | 'uuidArray'
  | 'trustItems'
  | 'testimonialItems'
  | 'faqItems'
  | 'promoCards';

export interface FieldDefinition {
  kind: FieldKind;
  values?: readonly string[];
  min?: number;
  max?: number;
}

export interface VariantDefinition {
  id: string;
  label: string;
  description: string;
}

export interface SectionDefaults {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  settings: Record<string, unknown>;
}

export interface SectionTypeDefinition {
  type: HomepageSectionType;
  label: string;
  category: string;
  description: string;
  variants: VariantDefinition[];
  defaults: SectionDefaults;
  fields: Record<string, FieldDefinition>;
}

const ALIGNMENT = ['left', 'center', 'right'] as const;
const CONTENT_WIDTH = ['narrow', 'normal', 'wide', 'full'] as const;
const IMAGE_POSITION = ['left', 'right', 'top', 'background'] as const;
const MOBILE_ORDER = ['text-first', 'image-first'] as const;

const COMMON_FIELDS: Record<string, FieldDefinition> = {
  alignment: { kind: 'enum', values: ALIGNMENT },
  contentWidth: { kind: 'enum', values: CONTENT_WIDTH },
  background: { kind: 'color' },
  textColor: { kind: 'color' },
  paddingTop: { kind: 'int', min: 0, max: 24 },
  paddingBottom: { kind: 'int', min: 0, max: 24 },
};

export const SECTION_REGISTRY: Record<HomepageSectionType, SectionTypeDefinition> = {
  hero: {
    type: 'hero',
    label: 'Hero banner',
    category: 'Hero & banners',
    description: 'Large headline, supporting copy and up to two call-to-action buttons.',
    variants: [
      { id: 'split-image-right', label: 'Split · image right', description: 'Text left, image right. The current live layout.' },
      { id: 'split-image-left', label: 'Split · image left', description: 'Mirrored split layout.' },
      { id: 'full-width-overlay', label: 'Full-width overlay', description: 'Edge-to-edge image with text over it.' },
      { id: 'centered-overlay', label: 'Centered overlay', description: 'Centered text over a background image.' },
      { id: 'minimal-centered', label: 'Minimal centered', description: 'Quiet centered text with a supporting image below.' },
      { id: 'promo-category', label: 'Promo category', description: 'Category-focused promotional hero.' },
    ],
    defaults: {
      title: 'Style Meets Substance',
      subtitle: 'New season',
      description: 'Thoughtfully made apparel for everyday wear.',
      imageUrl: '',
      buttonText: 'Shop Collection',
      buttonLink: '/shop',
      settings: { alignment: 'left', contentWidth: 'normal', paddingTop: 16, paddingBottom: 16 },
    },
    fields: {
      ...COMMON_FIELDS,
      imagePosition: { kind: 'enum', values: IMAGE_POSITION },
      mobileOrder: { kind: 'enum', values: MOBILE_ORDER },
      mobileImageUrl: { kind: 'url' },
      focalPoint: { kind: 'enum', values: ['center', 'top', 'bottom', 'left', 'right'] },
      overlayOpacity: { kind: 'int', min: 0, max: 90 },
      minHeight: { kind: 'int', min: 240, max: 900 },
      secondaryButtonText: { kind: 'string' },
      secondaryButtonLink: { kind: 'url' },
      secondaryButtonStyle: { kind: 'enum', values: ['primary', 'secondary', 'outline', 'ghost'] },
    },
  },

  categories: {
    type: 'categories',
    label: 'Shop by category',
    category: 'Categories',
    description: 'Show real categories from the catalogue in a card grid or scroller.',
    variants: [
      { id: 'circular-cards', label: 'Circular cards', description: 'Round category thumbnails.' },
      { id: 'square-cards', label: 'Square cards', description: 'Square image cards.' },
      { id: 'grid', label: 'Standard grid', description: 'Rectangular cards with names.' },
      { id: 'horizontal-scroll', label: 'Horizontal scroll', description: 'Touch-friendly scrolling row.' },
    ],
    defaults: {
      title: 'Shop by category',
      subtitle: 'Browse',
      description: '',
      settings: { columns: 4, categoryIds: [], showProductCount: false, paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      columns: { kind: 'int', min: 1, max: 6 },
      categoryIds: { kind: 'uuidArray' },
      showProductCount: { kind: 'bool' },
    },
  },

  products: {
    type: 'products',
    label: 'Product collection',
    category: 'Product collections',
    description: 'Grid or carousel sourced from real products — new arrivals, discounts, a category, a brand, or a manual pick.',
    variants: [
      { id: 'grid', label: 'Product grid', description: 'Responsive grid of product cards.' },
      { id: 'carousel', label: 'Product carousel', description: 'Horizontal scrolling product cards.' },
      { id: 'featured-plus-supporting', label: 'Featured + supporting', description: 'One large product beside a supporting row.' },
      { id: 'compact-grid', label: 'Compact cards', description: 'Denser grid for larger collections.' },
    ],
    defaults: {
      title: 'New arrivals',
      subtitle: 'Just in',
      description: '',
      buttonText: 'View all products',
      buttonLink: '/shop',
      settings: { productSource: 'new', productIds: [], categoryIds: [], brandIds: [], limit: 8, columns: 4, paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      productSource: { kind: 'enum', values: ['new', 'discount', 'category', 'brand', 'manual'] },
      productIds: { kind: 'uuidArray' },
      categoryIds: { kind: 'uuidArray' },
      brandIds: { kind: 'uuidArray' },
      limit: { kind: 'int', min: 1, max: 24 },
      columns: { kind: 'int', min: 1, max: 6 },
      showAddToCart: { kind: 'bool' },
    },
  },

  promotion: {
    type: 'promotion',
    label: 'Promotion',
    category: 'Promotions',
    description: 'Campaign cards or a full-width banner. Discount values are never invented.',
    variants: [
      { id: 'full-width-banner', label: 'Full-width banner', description: 'Single wide campaign banner.' },
      { id: 'two-cards', label: 'Two cards', description: 'Two side-by-side promotional cards.' },
      { id: 'three-columns', label: 'Three columns', description: 'Three offer cards.' },
      { id: 'image-overlay', label: 'Image overlay', description: 'Text over a background image.' },
    ],
    defaults: {
      title: 'Featured offer',
      subtitle: 'Limited time',
      description: '',
      settings: { columns: 2, overlayOpacity: 40, cards: [], paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      columns: { kind: 'int', min: 1, max: 4 },
      overlayOpacity: { kind: 'int', min: 0, max: 90 },
      cards: { kind: 'promoCards' },
    },
  },

  story: {
    type: 'story',
    label: 'About / brand story',
    category: 'Brand storytelling',
    description: 'Image and text composition. Preserves the current About layout as a variant.',
    variants: [
      { id: 'image-left', label: 'Image left', description: 'Image left, text right.' },
      { id: 'image-right', label: 'Image right', description: 'Text left, image right.' },
      { id: 'full-width-bg', label: 'Full-width background', description: 'Text over a background image.' },
      { id: 'centered', label: 'Centered story', description: 'Centered copy with an image below.' },
    ],
    defaults: {
      title: 'Our story',
      subtitle: 'About us',
      description: '',
      settings: { alignment: 'left', imagePosition: 'left', mobileOrder: 'text-first', paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      imagePosition: { kind: 'enum', values: IMAGE_POSITION },
      mobileOrder: { kind: 'enum', values: MOBILE_ORDER },
      mobileImageUrl: { kind: 'url' },
      overlayOpacity: { kind: 'int', min: 0, max: 90 },
      secondaryButtonText: { kind: 'string' },
      secondaryButtonLink: { kind: 'url' },
    },
  },

  trust: {
    type: 'trust',
    label: 'Trust & benefits',
    category: 'Trust & social proof',
    description: 'Delivery, payment, returns and support promises written by the store owner.',
    variants: [
      { id: 'benefits-row', label: 'Benefits row', description: 'Compact horizontal row.' },
      { id: 'icon-cards', label: 'Icon cards', description: 'Card per benefit with an icon.' },
      { id: 'compact-badges', label: 'Compact badges', description: 'Small inline badges.' },
    ],
    defaults: {
      title: 'Why shop with us',
      subtitle: '',
      description: '',
      settings: { columns: 4, items: [], paddingTop: 8, paddingBottom: 8 },
    },
    fields: {
      ...COMMON_FIELDS,
      columns: { kind: 'int', min: 1, max: 4 },
      items: { kind: 'trustItems' },
    },
  },

  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    category: 'Trust & social proof',
    description: 'Customer quotes entered by the admin. Nothing is fabricated.',
    variants: [
      { id: 'cards', label: 'Review cards', description: 'Grid of quote cards.' },
      { id: 'featured', label: 'Featured quote', description: 'One large highlighted quote.' },
    ],
    defaults: {
      title: 'What customers say',
      subtitle: '',
      description: '',
      settings: { columns: 3, items: [], paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      columns: { kind: 'int', min: 1, max: 3 },
      items: { kind: 'testimonialItems' },
    },
  },

  logos: {
    type: 'logos',
    label: 'Brand logos',
    category: 'Trust & social proof',
    description: 'Uses the existing CMS brand logos.',
    variants: [
      { id: 'carousel', label: 'Logo row', description: 'Scrolling row of brand logos.' },
    ],
    defaults: {
      title: 'Brands we carry',
      subtitle: '',
      description: '',
      settings: { limit: 12, grayscale: true, paddingTop: 8, paddingBottom: 8 },
    },
    fields: {
      ...COMMON_FIELDS,
      limit: { kind: 'int', min: 1, max: 24 },
      grayscale: { kind: 'bool' },
    },
  },

  faq: {
    type: 'faq',
    label: 'FAQ',
    category: 'Informational content',
    description: 'Question and answer accordion.',
    variants: [
      { id: 'accordion', label: 'Accordion', description: 'Collapsible question list.' },
    ],
    defaults: {
      title: 'Frequently asked questions',
      subtitle: '',
      description: '',
      settings: { items: [], paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      items: { kind: 'faqItems' },
    },
  },

  banner: {
    type: 'banner',
    label: 'Custom banner',
    category: 'Hero & banners',
    description: 'Simple promotional banner (legacy custom section).',
    variants: [
      { id: 'default', label: 'Banner', description: 'Centered copy over a dark gradient.' },
      { id: 'image-overlay', label: 'Image overlay', description: 'Copy over your own image.' },
    ],
    defaults: {
      title: 'Custom banner',
      subtitle: '',
      description: '',
      buttonText: 'Shop now',
      buttonLink: '/shop',
      settings: { alignment: 'center', overlayOpacity: 40, paddingTop: 12, paddingBottom: 12 },
    },
    fields: {
      ...COMMON_FIELDS,
      imagePosition: { kind: 'enum', values: IMAGE_POSITION },
      overlayOpacity: { kind: 'int', min: 0, max: 90 },
      secondaryButtonText: { kind: 'string' },
      secondaryButtonLink: { kind: 'url' },
    },
  },
};

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY) as HomepageSectionType[];

export function isSectionType(value: unknown): value is HomepageSectionType {
  return typeof value === 'string' && value in SECTION_REGISTRY;
}

export function getVariantIds(type: HomepageSectionType): string[] {
  return SECTION_REGISTRY[type].variants.map((v) => v.id);
}

export function resolveVariant(type: HomepageSectionType, variant?: string | null): string {
  const ids = getVariantIds(type);
  if (variant && ids.includes(variant)) return variant;
  return ids[0];
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const COLOR_TOKENS = ['primary', 'secondary', 'accent', 'neutral', 'base-100', 'base-200', 'base-300', 'base-content'];

/** Accepts a hex colour, an approved daisyUI token, or nothing. */
export function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (HEX_COLOR.test(v)) return v;
  if (COLOR_TOKENS.includes(v)) return v;
  return undefined;
}

/** Relative app paths or absolute http(s) URLs only. */
export function sanitizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.length > 2000) return undefined;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(mailto|tel):/i.test(v)) return v;
  return undefined;
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  return v.slice(0, maxLength);
}

function sanitizeInt(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeUuidArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return value.filter((v): v is string => typeof v === 'string' && uuid.test(v)).slice(0, 50);
}

function sanitizeTrustItems(value: unknown): Record<string, string>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 12)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      icon: sanitizeString(item.icon, 40) ?? 'CheckCircle2',
      title: sanitizeString(item.title, 120) ?? '',
      description: sanitizeString(item.description, 400) ?? '',
    }))
    .filter((item) => item.title);
}

function sanitizeTestimonialItems(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 12)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      name: sanitizeString(item.name, 120) ?? '',
      role: sanitizeString(item.role, 120) ?? '',
      quote: sanitizeString(item.quote, 1000) ?? '',
      rating: sanitizeInt(item.rating, 1, 5) ?? undefined,
      imageUrl: sanitizeUrl(item.imageUrl),
    }))
    .filter((item) => item.name && item.quote);
}

function sanitizeFaqItems(value: unknown): Record<string, string>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 30)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      question: sanitizeString(item.question, 300) ?? '',
      answer: sanitizeString(item.answer, 2000) ?? '',
    }))
    .filter((item) => item.question && item.answer);
}

function sanitizePromoCards(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 4)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      title: sanitizeString(item.title, 160) ?? '',
      description: sanitizeString(item.description, 400) ?? '',
      imageUrl: sanitizeUrl(item.imageUrl),
      buttonText: sanitizeString(item.buttonText, 60),
      buttonLink: sanitizeUrl(item.buttonLink),
      eyebrow: sanitizeString(item.eyebrow, 60),
    }))
    .filter((item) => item.title);
}

/**
 * Strips unknown keys, coerces numbers/booleans and validates every value.
 * Returns only keys the section type declares.
 */
export function sanitizeSettings(
  type: HomepageSectionType,
  raw: unknown,
): Record<string, unknown> {
  const fields = SECTION_REGISTRY[type].fields;
  const settings =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const out: Record<string, unknown> = {};

  for (const [key, definition] of Object.entries(fields)) {
    if (!(key in settings)) continue;
    const value = settings[key];
    if (value === null || value === undefined) continue;

    switch (definition.kind) {
      case 'string': {
        const v = sanitizeString(value, 300);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'text': {
        const v = sanitizeString(value, 2000);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'url': {
        const v = sanitizeUrl(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'color': {
        const v = sanitizeColor(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'int': {
        const v = sanitizeInt(value, definition.min ?? 0, definition.max ?? 1000);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'bool': {
        if (typeof value === 'boolean') out[key] = value;
        break;
      }
      case 'enum': {
        if (typeof value === 'string' && definition.values?.includes(value)) {
          out[key] = value;
        }
        break;
      }
      case 'uuidArray': {
        const v = sanitizeUuidArray(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'trustItems': {
        const v = sanitizeTrustItems(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'testimonialItems': {
        const v = sanitizeTestimonialItems(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'faqItems': {
        const v = sanitizeFaqItems(value);
        if (v !== undefined) out[key] = v;
        break;
      }
      case 'promoCards': {
        const v = sanitizePromoCards(value);
        if (v !== undefined) out[key] = v;
        break;
      }
    }
  }

  return out;
}

/** Default settings for a type/variant, merged with validated overrides. */
export function mergeSettings(
  type: HomepageSectionType,
  variant: string,
  raw: unknown,
): Record<string, unknown> {
  const defaults = SECTION_REGISTRY[type].defaults.settings;
  const sanitized = sanitizeSettings(type, raw);
  return { ...defaults, ...sanitized, variant };
}

/** Factory layout used when the homepage has no sections or is reset. */
export function getFactorySections(): Array<{
  type: HomepageSectionType;
  variant: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  settings: Record<string, unknown>;
  sortOrder: number;
}> {
  return [
    { type: 'hero', variant: 'split-image-right' },
    { type: 'products', variant: 'grid' },
    { type: 'story', variant: 'image-left' },
  ].map((entry, index) => {
    const definition = SECTION_REGISTRY[entry.type as HomepageSectionType];
    return {
      type: entry.type as HomepageSectionType,
      variant: entry.variant,
      title: definition.defaults.title,
      subtitle: definition.defaults.subtitle,
      description: definition.defaults.description,
      imageUrl: definition.defaults.imageUrl,
      buttonText: definition.defaults.buttonText,
      buttonLink: definition.defaults.buttonLink,
      settings: mergeSettings(entry.type as HomepageSectionType, entry.variant, {}),
      sortOrder: index + 1,
    };
  });
}
