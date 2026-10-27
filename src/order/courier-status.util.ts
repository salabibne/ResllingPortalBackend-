/**
 * The courier (Steadfast) status is the only order status users see.
 * An order that has not been booked yet has courierStatus = null and is
 * presented as "order_placed".
 */
export const ORDER_PLACED = 'order_placed';

export type CourierStatusGroup =
  | 'ORDER_PLACED'
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'PARTIAL'
  | 'CANCELLED';

export const COURIER_STATUS_GROUPS: CourierStatusGroup[] = [
  'ORDER_PLACED',
  'PENDING',
  'IN_TRANSIT',
  'DELIVERED',
  'PARTIAL',
  'CANCELLED',
];

const PENDING_STATUSES = ['pending', 'in_review'];

export function effectiveCourierStatus(order: { courierStatus?: string | null }): string {
  return order.courierStatus ? order.courierStatus.toLowerCase() : ORDER_PLACED;
}

export function courierGroupOf(status?: string | null): CourierStatusGroup {
  const s = (status || '').toLowerCase().trim();
  if (!s || s === ORDER_PLACED) return 'ORDER_PLACED';
  if (s.startsWith('cancelled') && s !== 'cancelled_approval_pending') return 'CANCELLED';
  if (s.startsWith('partial_delivered') && s !== 'partial_delivered_approval_pending') return 'PARTIAL';
  if (s === 'delivered') return 'DELIVERED';
  if (PENDING_STATUSES.includes(s)) return 'PENDING';
  // in_transit, hold, *_approval_pending, exceptional, unknown
  return 'IN_TRANSIT';
}

export function isCourierStatusGroup(value: string): value is CourierStatusGroup {
  return (COURIER_STATUS_GROUPS as string[]).includes(value);
}

/** Prisma `where` fragment selecting the orders whose courier status falls in a group. */
export function courierGroupWhere(group: CourierStatusGroup): any {
  switch (group) {
    case 'ORDER_PLACED':
      return { courierStatus: null };
    case 'PENDING':
      return { courierStatus: { in: PENDING_STATUSES } };
    case 'DELIVERED':
      return { courierStatus: 'delivered' };
    case 'PARTIAL':
      return {
        AND: [
          { courierStatus: { startsWith: 'partial_delivered' } },
          { courierStatus: { not: 'partial_delivered_approval_pending' } },
        ],
      };
    case 'CANCELLED':
      return {
        AND: [
          { courierStatus: { startsWith: 'cancelled' } },
          { courierStatus: { not: 'cancelled_approval_pending' } },
        ],
      };
    case 'IN_TRANSIT':
      return {
        AND: [
          { courierStatus: { not: null } },
          { courierStatus: { notIn: [...PENDING_STATUSES, 'delivered'] } },
          {
            OR: [
              { courierStatus: { in: ['partial_delivered_approval_pending', 'cancelled_approval_pending'] } },
              {
                AND: [
                  { NOT: { courierStatus: { startsWith: 'partial_delivered' } } },
                  { NOT: { courierStatus: { startsWith: 'cancelled' } } },
                ],
              },
            ],
          },
        ],
      };
  }
}

/**
 * Reseller profit buckets, derived from the courier status:
 * earned = delivered (fully or partially) and paid; excluded = cancelled.
 */
export function profitBucket(order: {
  courierStatus?: string | null;
  paymentStatus?: string | null;
}): 'EARNED' | 'EXCLUDED' | 'PENDING' {
  const group = courierGroupOf(order.courierStatus);
  if (group === 'CANCELLED') return 'EXCLUDED';
  if (
    (group === 'DELIVERED' || group === 'PARTIAL') &&
    (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIAL')
  ) {
    return 'EARNED';
  }
  return 'PENDING';
}
