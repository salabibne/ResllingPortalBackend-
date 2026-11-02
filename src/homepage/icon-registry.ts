/**
 * Icons the Homepage Builder may store.
 *
 * An icon value is one string:
 *   - a Lucide icon name from ALLOWED_ICON_NAMES, e.g. "Truck"
 *   - "emoji:" followed by an emoji, e.g. "emoji:🚀"
 *   - "none" to hide an optional icon
 *
 * ALLOWED_ICON_NAMES must match the names in the frontend's
 * `src/components/homepage/icon-library.ts`. Add new icons to both files.
 */

export const ALLOWED_ICON_NAMES = [
  // Commerce
  'ShoppingBag', 'ShoppingCart', 'ShoppingBasket', 'Store', 'Package', 'PackageCheck',
  'PackageOpen', 'Boxes', 'Tag', 'Tags', 'Gift', 'Shirt', 'Receipt', 'Percent', 'Barcode',
  'Gem', 'Crown', 'Watch', 'Glasses',
  // Delivery
  'Truck', 'Bike', 'Car', 'Plane', 'Ship', 'MapPin', 'Map', 'Navigation', 'Warehouse',
  'Clock', 'Timer', 'Hourglass', 'RotateCcw', 'Undo2', 'Route', 'Container',
  // Money
  'DollarSign', 'CircleDollarSign', 'BadgeDollarSign', 'Banknote', 'Wallet', 'CreditCard',
  'HandCoins', 'Coins', 'PiggyBank', 'Landmark', 'BadgePercent', 'Calculator', 'Scale',
  // Trust & security
  'Shield', 'ShieldCheck', 'Lock', 'LockKeyhole', 'KeyRound', 'BadgeCheck', 'CircleCheckBig',
  'CircleCheck', 'CheckCircle2', 'Award', 'Medal', 'Trophy', 'ThumbsUp', 'Fingerprint',
  // Growth
  'TrendingUp', 'LineChart', 'BarChart3', 'PieChart', 'Activity', 'Target', 'Rocket', 'Zap',
  'Flame', 'Gauge', 'ArrowUpRight',
  // AI & tech
  'Search', 'Sparkles', 'Bot', 'Brain', 'BrainCircuit', 'Cpu', 'WandSparkles', 'Lightbulb',
  'Laptop', 'Smartphone', 'Monitor', 'Tablet', 'Globe', 'Wifi', 'Code', 'Cloud', 'Database',
  'QrCode',
  // People & support
  'Users', 'User', 'UserPlus', 'UserCheck', 'HeartHandshake', 'Handshake', 'Headphones',
  'Headset', 'LifeBuoy', 'GraduationCap', 'BookOpen', 'Baby', 'Smile', 'PersonStanding',
  // Communication
  'MessageCircle', 'MessageSquare', 'MessagesSquare', 'Phone', 'PhoneCall', 'Mail', 'Send',
  'Bell', 'BellRing', 'Megaphone', 'Share2', 'Newspaper', 'AtSign', 'Rss',
  // Media
  'Image', 'Images', 'Camera', 'Video', 'Film', 'Play', 'CirclePlay', 'Download', 'Upload',
  'FileText', 'Folder', 'Mic',
  // General
  'Star', 'Heart', 'Calendar', 'CalendarCheck', 'Settings', 'Layers', 'LayoutGrid', 'Leaf',
  'Recycle', 'House', 'Building2', 'Flag', 'ArrowRight', 'ChevronRight', 'Check', 'Plus',
  'Info', 'CircleHelp', 'Infinity', 'Sun', 'Moon', 'Bookmark', 'Link', 'Eye', 'Puzzle',
  'Palette', 'Scissors', 'Hammer', 'Wrench',
] as const;

const ICON_NAME_SET = new Set<string>(ALLOWED_ICON_NAMES);

export const NO_ICON = 'none';
const EMOJI_PREFIX = 'emoji:';
const PICTOGRAPHIC = /\p{Extended_Pictographic}|⃣/u;
const UNSAFE_IN_EMOJI = /[A-Za-z<>"'&`\\]/;

/** Returns a storable icon value, or `fallback` when the value is not allowed. */
export function sanitizeIcon(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (!v) return fallback;
  if (v === NO_ICON) return v;
  if (ICON_NAME_SET.has(v)) return v;
  if (v.startsWith(EMOJI_PREFIX)) {
    const emoji = v.slice(EMOJI_PREFIX.length).trim();
    if (emoji && emoji.length <= 16 && PICTOGRAPHIC.test(emoji) && !UNSAFE_IN_EMOJI.test(emoji)) {
      return `${EMOJI_PREFIX}${emoji}`;
    }
  }
  return fallback;
}
