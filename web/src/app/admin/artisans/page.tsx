import { getProductCountsByArtisan, listAllArtisansAdmin } from '@/lib/db';
import ArtisansClient from './ArtisansClient';

export const dynamic = 'force-dynamic';

export default async function AdminArtisansPage() {
  const [artisans, counts] = await Promise.all([
    listAllArtisansAdmin(),
    getProductCountsByArtisan(),
  ]);
  const withProducts = artisans.map((a) => ({
    ...a,
    productCount: counts.get(a.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-brand-900">Artisan management</h1>
      <ArtisansClient initial={withProducts.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        craft_type: a.craft_type,
        location: a.location,
        verification_status: a.verification_status,
        productCount: a.productCount,
      }))} />
    </div>
  );
}
