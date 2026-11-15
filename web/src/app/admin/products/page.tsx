import { listAllProducts, getArtisan, store } from '@/lib/db';
import { sql } from '@/lib/dbPg';
import AdminProductsClient from './AdminProductsClient';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: number;
  name: string;
  price: number;
  status: string;
  artisan: string;
  category: string | null;
  order_count: number;
};

export default async function AdminProductsPage() {
  let products: ProductRow[] = [];

  if (process.env.DATABASE_URL) {
    const rows = await sql`
      select p.*, a.name as artisan_name,
        (select count(*)::int from order_items oi where oi.product_id = p.id) as order_count
      from products p
      left join artisans a on a.id = p.artisan_id
      order by p.created_at desc limit 200`;
    products = (rows as unknown as Record<string, unknown>[]).map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      price: Number(r.price),
      status: String(r.status),
      artisan: String(r.artisan_name ?? '—'),
      category: (r.category as string) ?? null,
      order_count: Number(r.order_count ?? 0),
    }));
  } else {
    const all = await listAllProducts();
    products = await Promise.all(
      all.map(async (p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        status: p.status,
        artisan: (await getArtisan(p.artisan_id))?.name ?? '—',
        category: p.category,
        order_count: store!.order_items.filter((x) => x.product_id === p.id).length,
      }))
    );
  }

  return (
  <div>
    <div className="border-b border-gray-300 pb-4">
      <h1 className="font-serif text-2xl font-bold text-[#3D3028]">Craft Listings</h1>
      <p className="mt-1 text-sm text-[#71675F]">
        Review, edit and manage every product listed by artisans.
      </p>
    </div>
    <AdminProductsClient initial={products} />
  </div>
);
}