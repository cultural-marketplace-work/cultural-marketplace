import { sql, usingPg } from './dbPg';

// Demographic + operational analytics for the admin console.
export interface Analytics {
  totalCustomers: number;
  totalArtisans: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  // Signups per week, last 12 weeks (customers vs artisans)
  signupTrend: Array<{ week: string; customers: number; artisans: number }>;
  // Where artisans are located (top 8) — placement & outreach decisions
  artisanLocations: Array<{ location: string; count: number }>;
  // Where customers are located (top 8) — demand-side demographics
  customerLocations: Array<{ location: string; count: number }>;
  // Category mix of listings vs what actually sells (revenue by category)
  categoryListings: Array<{ category: string; count: number }>;
  categoryRevenue: Array<{ category: string; revenue: number; units: number }>;
  // Payment method split — informs payment/partnership decisions
  paymentSplit: Array<{ method: string; count: number }>;
  // Order lifecycle funnel + delivery outcome
  orderStatusCounts: Array<{ status: string; count: number }>;
  // Ratings distribution — quality signal
  ratingDistribution: Array<{ stars: number; count: number }>;
  // Top sellers by revenue (last 90 days)
  topProducts: Array<{ id: number; name: string; units: number; revenue: number }>;
  // Revenue per week, last 12 weeks
  revenueTrend: Array<{ week: string; revenue: number }>;
}

const WEEKS = 12;
const CACHE_TTL_MS = 30_000;

let cachedAnalytics: { data: Analytics; expiresAt: number } | null = null;
let pendingAnalytics: Promise<Analytics> | null = null;

type NumericRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid analytics date returned by database: ${String(value)}`);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Each function below owns one analytics area.
 * The coordinator awaits these groups in sequence, limiting database
 * concurrency to at most three queries at a time.
 */

async function getAnalyticsSummary(): Promise<{
  totalCustomers: number;
  totalArtisans: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}> {
  const rows = await sql<NumericRow[]>`
    select
      (select count(*) from users where role = 'customer') as customers,
      (select count(*) from artisans) as artisans,
      (select count(*) from orders) as orders,
      (
        select coalesce(sum(oi.price * oi.quantity), 0)
        from order_items oi
        join orders o on o.id = oi.order_id
        where o.status <> 'cancelled'
      ) as revenue,
      (
        select coalesce(avg(o.total_amount), 0)
        from orders o
        where o.status <> 'cancelled'
      ) as aov
  `;

  const row = rows[0] ?? {};
  return {
    totalCustomers: toNumber(row.customers),
    totalArtisans: toNumber(row.artisans),
    totalOrders: toNumber(row.orders),
    totalRevenue: toNumber(row.revenue),
    avgOrderValue: toNumber(row.aov),
  };
}

async function getSignupAnalytics(): Promise<Analytics['signupTrend']> {
  const rows = await sql<Array<{
    week: string | Date;
    customers: string | number;
    artisans: string | number;
  }>>`
    select
      date_trunc('week', account.created_at) as week,
      count(*) filter (where account.account_type = 'customer') as customers,
      count(*) filter (where account.account_type = 'artisan') as artisans
    from (
      select created_at, 'customer'::text as account_type
      from users
      where role = 'customer'
      union all
      select created_at, 'artisan'::text as account_type
      from artisans
    ) account
    where account.created_at >= now() - (${WEEKS}::int * interval '1 week')
    group by 1
    order by 1
  `;

  return rows.map((row) => ({
    week: toDateKey(row.week),
    customers: toNumber(row.customers),
    artisans: toNumber(row.artisans),
  }));
}

async function getLocationAnalytics(): Promise<{
  artisanLocations: Analytics['artisanLocations'];
  customerLocations: Analytics['customerLocations'];
}> {
  const [artisanRows, customerRows] = await Promise.all([
    sql<Array<{ location: string; count: string | number }>>`
      select
        coalesce(nullif(trim(min(location)), ''), 'Unknown') as location,
        count(*) as count
      from artisans
      group by lower(coalesce(nullif(trim(location), ''), 'Unknown'))
      order by count desc
      limit 8
    `,
    sql<Array<{ location: string; count: string | number }>>`
      select
        coalesce(nullif(trim(min(u.location)), ''), 'Unknown') as location,
        count(*) as count
      from users u
      where u.role = 'customer'
      group by lower(coalesce(nullif(trim(u.location), ''), 'Unknown'))
      order by count desc
      limit 8
    `,
  ]);

  return {
    artisanLocations: artisanRows.map((row) => ({
      location: row.location,
      count: toNumber(row.count),
    })),
    customerLocations: customerRows.map((row) => ({
      location: row.location,
      count: toNumber(row.count),
    })),
  };
}

async function getProductAnalytics(): Promise<{
  categoryListings: Analytics['categoryListings'];
  categoryRevenue: Analytics['categoryRevenue'];
  topProducts: Analytics['topProducts'];
}> {
  const [listingRows, revenueRows, topProductRows] = await Promise.all([
    sql<Array<{ category: string; count: string | number }>>`
      select
        coalesce(nullif(trim(category), ''), 'Uncategorized') as category,
        count(*) as count
      from products
      group by 1
      order by count desc
      limit 8
    `,
    sql<Array<{
      category: string;
      revenue: string | number;
      units: string | number;
    }>>`
      select
        coalesce(nullif(trim(p.category), ''), 'Uncategorized') as category,
        sum(oi.price * oi.quantity) as revenue,
        sum(oi.quantity) as units
      from order_items oi
      join products p on p.id = oi.product_id
      join orders o on o.id = oi.order_id
      where o.status <> 'cancelled'
      group by 1
      order by revenue desc nulls last
      limit 8
    `,
    sql<Array<{
      id: number | string;
      name: string;
      units: string | number;
      revenue: string | number;
    }>>`
      select
        p.id,
        p.name,
        sum(oi.quantity) as units,
        sum(oi.price * oi.quantity) as revenue
      from order_items oi
      join products p on p.id = oi.product_id
      join orders o on o.id = oi.order_id
      where o.status <> 'cancelled'
        and oi.created_at >= now() - interval '90 days'
      group by p.id, p.name
      order by revenue desc nulls last
      limit 5
    `,
  ]);

  return {
    categoryListings: listingRows.map((row) => ({
      category: row.category,
      count: toNumber(row.count),
    })),
    categoryRevenue: revenueRows.map((row) => ({
      category: row.category,
      revenue: toNumber(row.revenue),
      units: toNumber(row.units),
    })),
    topProducts: topProductRows.map((row) => ({
      id: toNumber(row.id),
      name: row.name,
      units: toNumber(row.units),
      revenue: toNumber(row.revenue),
    })),
  };
}

async function getOrderAnalytics(): Promise<{
  paymentSplit: Analytics['paymentSplit'];
  orderStatusCounts: Analytics['orderStatusCounts'];
  revenueTrend: Analytics['revenueTrend'];
}> {
  const [paymentRows, statusRows, revenueRows] = await Promise.all([
    sql<Array<{ method: string; count: string | number }>>`
      select
        coalesce(nullif(trim(payment_method), ''), 'cod') as method,
        count(*) as count
      from orders
      group by 1
      order by count desc
    `,
    sql<Array<{ status: string; count: string | number }>>`
      select status, count(*) as count
      from orders
      group by 1
      order by count desc
    `,
    sql<Array<{ week: string | Date; revenue: string | number }>>`
      select
        date_trunc('week', o.created_at) as week,
        coalesce(sum(oi.price * oi.quantity), 0) as revenue
      from orders o
      join order_items oi on oi.order_id = o.id
      where o.status <> 'cancelled'
        and o.created_at >= now() - (${WEEKS}::int * interval '1 week')
      group by 1
      order by 1
    `,
  ]);

  return {
    paymentSplit: paymentRows.map((row) => ({
      method: row.method,
      count: toNumber(row.count),
    })),
    orderStatusCounts: statusRows.map((row) => ({
      status: row.status,
      count: toNumber(row.count),
    })),
    revenueTrend: revenueRows.map((row) => ({
      week: toDateKey(row.week),
      revenue: toNumber(row.revenue),
    })),
  };
}

async function getRatingAnalytics(): Promise<Analytics['ratingDistribution']> {
  const rows = await sql<Array<{ stars: string | number; count: string | number }>>`
    select review_rating as stars, count(*) as count
    from order_items
    where review_rating is not null
    group by 1
    order by 1
  `;

  return rows.map((row) => ({
    stars: toNumber(row.stars),
    count: toNumber(row.count),
  }));
}

async function getDemoAnalytics(): Promise<Analytics> {
  const { demo } = await import('./db');
  const s = demo();

  const customers = s.users.filter((user) => user.role === 'customer');
  const artisans = s.artisans;
  const orders = s.orders;
  const validOrders = orders.filter((order) => order.status !== 'cancelled');

  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const productsById = new Map(s.products.map((product) => [product.id, product]));

  const validOrderItems = s.order_items.filter((item) => {
    const order = ordersById.get(item.order_id);
    return order && order.status !== 'cancelled';
  });

  const totalRevenue = validOrderItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const avgOrderValue = validOrders.length ? totalRevenue / validOrders.length : 0;

  function countLocations(items: Array<{ location?: string | null }>) {
    const counts = new Map<string, number>();
    for (const item of items) {
      const location = item.location?.trim() || 'Unknown';
      counts.set(location, (counts.get(location) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  const categoryCounts = new Map<string, number>();
  for (const product of s.products) {
    const category = product.category?.trim() || 'Uncategorized';
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }
  const categoryListings = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const categoryRevenueMap = new Map<string, { revenue: number; units: number }>();
  for (const item of validOrderItems) {
    const product = productsById.get(item.product_id);
    const category = product?.category?.trim() || 'Uncategorized';
    const current = categoryRevenueMap.get(category) ?? { revenue: 0, units: 0 };
    current.revenue += Number(item.price) * item.quantity;
    current.units += item.quantity;
    categoryRevenueMap.set(category, current);
  }
  const categoryRevenue = Array.from(categoryRevenueMap.entries())
    .map(([category, values]) => ({
      category,
      revenue: values.revenue,
      units: values.units,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const paymentCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  for (const order of orders) {
    const method = order.payment_method || 'cod';
    paymentCounts.set(method, (paymentCounts.get(method) ?? 0) + 1);
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }

  const ratingCounts = new Map<number, number>();
  for (const item of s.order_items) {
    if (item.review_rating != null && item.review_rating > 0) {
      ratingCounts.set(
        item.review_rating,
        (ratingCounts.get(item.review_rating) ?? 0) + 1,
      );
    }
  }

  const productRevenue = new Map<
    number,
    { id: number; name: string; units: number; revenue: number }
  >();
  for (const item of validOrderItems) {
    const current = productRevenue.get(item.product_id) ?? {
      id: item.product_id,
      name: item.product_name,
      units: 0,
      revenue: 0,
    };
    current.units += item.quantity;
    current.revenue += Number(item.price) * item.quantity;
    productRevenue.set(item.product_id, current);
  }

  return {
    totalCustomers: customers.length,
    totalArtisans: artisans.length,
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue,
    signupTrend: [
      { week: '2026-09-01', customers: 2, artisans: 1 },
      { week: '2026-09-08', customers: 3, artisans: 2 },
      { week: '2026-09-15', customers: 4, artisans: 1 },
      { week: '2026-09-22', customers: 5, artisans: 2 },
    ],
    artisanLocations: countLocations(artisans),
    customerLocations: countLocations(customers),
    categoryListings,
    categoryRevenue,
    paymentSplit: Array.from(paymentCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count),
    orderStatusCounts: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: ratingCounts.get(stars) ?? 0,
    })),
    topProducts: Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    revenueTrend: [
      { week: '2026-09-01', revenue: Math.round(totalRevenue * 0.2) },
      { week: '2026-09-08', revenue: Math.round(totalRevenue * 0.25) },
      { week: '2026-09-15', revenue: Math.round(totalRevenue * 0.25) },
      { week: '2026-09-22', revenue: Math.round(totalRevenue * 0.3) },
    ],
  };
}

async function loadAdminAnalytics(): Promise<Analytics> {
  if (!usingPg) {
    return getDemoAnalytics();
  }

  // Run analytics groups sequentially. Only related queries within a group
  // execute together, so this page no longer starts all 11 queries at once.
  const summary = await getAnalyticsSummary();
  const signupTrend = await getSignupAnalytics();
  const locations = await getLocationAnalytics();
  const products = await getProductAnalytics();
  const orders = await getOrderAnalytics();
  const ratingDistribution = await getRatingAnalytics();

  return {
    ...summary,
    signupTrend,
    ...locations,
    ...products,
    ...orders,
    ratingDistribution,
  };
}

export async function getAdminAnalytics(): Promise<Analytics> {
  if (cachedAnalytics && Date.now() < cachedAnalytics.expiresAt) {
    return cachedAnalytics.data;
  }

  // Share one in-flight request between concurrent page requests.
  if (pendingAnalytics) {
    return pendingAnalytics;
  }

  pendingAnalytics = loadAdminAnalytics();

  try {
    const result = await pendingAnalytics;
    cachedAnalytics = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return result;
  } catch (error) {
    // Do not return demo or empty analytics when the real database query fails.
    console.error('[admin analytics] Failed to load analytics:', error);
    throw error;
  } finally {
    pendingAnalytics = null;
  }
}
