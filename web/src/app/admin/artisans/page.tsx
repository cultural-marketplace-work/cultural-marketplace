import { getProductCountsByArtisan, listAllArtisansAdmin } from '@/lib/db';
import ArtisansClient from './ArtisansClient';
import { BadgeCheck, Users } from 'lucide-react';

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
    <div className="mx-auto max-w-7xl">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <Users size={15} aria-hidden="true" />
              Artisan directory
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">Artisan Management</h1>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Review applications, manage artisan accounts, and support the makers behind each craft.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            <BadgeCheck size={17} aria-hidden="true" />
            {artisans.length} {artisans.length === 1 ? 'artisan account' : 'artisan accounts'}
          </div>
        </div>
      </section>
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
