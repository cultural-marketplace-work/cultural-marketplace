import { listTaggedProducts, listUntaggedProducts } from '@/lib/adminDb';
import NfcAdminClient from './NfcAdminClient';
import { Nfc } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminNfcPage() {
  const [tagged, untagged] = await Promise.all([
    listTaggedProducts(),
    listUntaggedProducts(),
  ]);

  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl space-y-5 font-sans">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage: "url('/images/kalinga-weave.svg')",
            backgroundSize: '240px',
          }}
        />

        <div
          aria-hidden="true"
          className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <Nfc size={15} aria-hidden="true" />
              Product authentication
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              NFC Tags
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Monitor product NFC tags, check tag assignments, and manage
              replacements for product authentication.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {tagged.length} {tagged.length === 1 ? 'tagged product' : 'tagged products'}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-stone-600 sm:p-5">
        <div className="flex items-center gap-2">
          <Nfc size={18} className="text-brand-800" aria-hidden="true" />
          <h2 className="font-semibold text-brand-800">Writing NFC cards</h2>
        </div>

        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6">
          <li>
            <b>On Android Chrome (best):</b> open this page on your phone, press{' '}
            <b>Write to card</b>, and hold the round card to the phone. Written
            and verified in one step.
          </li>
          <li>
            <b>On iPhone / any device:</b> press <b>Copy link</b>, then use the
            free <b>NFC Tools</b> app: <b>Write → Add a record → URL</b> → paste
            → tap the card.
          </li>
          <li>
            Test by tapping the card — the verify page should open by itself.
          </li>
        </ol>

        <p className="mt-3 text-xs leading-5 text-stone-500">
          In-browser writing needs Chrome on Android over HTTPS — it works here
          on localhost for testing, and on Vercel once deployed. Artisans write
          tags for their own products from the product edit page; this page is
          for oversight and replacements.
        </p>
      </section>

      <div className="min-w-0">
        <NfcAdminClient
          tagged={tagged.map((p) => ({
            id: p.id,
            name: p.name,
            tag: p.nfc_tag_id ?? '',
            status: p.nfc_tag_status ?? 'active',
          }))}
          untagged={untagged.map((p) => ({
            id: p.id,
            name: p.name,
          }))}
        />
      </div>
    </main>
  );
}