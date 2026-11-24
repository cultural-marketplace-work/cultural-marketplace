import ReportForm from './ReportForm';
import { getProduct, getArtisan, listActiveProducts, listApprovedArtisans } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TYPES = ['product', 'artisan', 'experience'] as const;
type ReportType = (typeof TYPES)[number];

export default async function CustomerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const sp = await searchParams;

  const [products, artisans] = await Promise.all([listActiveProducts(), listApprovedArtisans()]);

  // Prefill when the customer arrives from a "Report" button
  let prefill: { type: ReportType; id: number; name: string } | null = null;
  const type = TYPES.find((t) => t === sp.type);
  const id = Number(sp.id);
  if (type && Number.isFinite(id) && id > 0) {
    const name =
      type === 'artisan' ? (await getArtisan(id))?.name : (await getProduct(id))?.name;
    if (name) prefill = { type, id, name };
  }

  return (
    <main className="min-h-screen bg-[#FCF9F4] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
          <div aria-hidden="true" className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />
          <div className="relative z-10">
            <h1 className="font-serif text-3xl font-bold text-[#3D3028] sm:text-4xl">Report an issue</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71675F]">
              Report a listing or artisan that violates our community rules.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-2xl">
            <ReportForm
              prefill={prefill}
              options={{
                product: products.map((p) => ({ id: p.id, name: p.name })),
                experience: products
                  .filter((p) => p.has_tutorial)
                  .map((p) => ({ id: p.id, name: p.tutorial_title || p.name })),
                artisan: artisans.map((a) => ({ id: a.id, name: a.name })),
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}