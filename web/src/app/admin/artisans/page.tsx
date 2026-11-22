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
      <ArtisansClient initial={withProducts.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        craft_type: a.craft_type,
        location: a.location,
        verification_status: a.verification_status,
        application_submitted: a.application_submitted !== false,
        productCount: a.productCount,
      }))} />
    </div>
  );
}
