import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CalendarDays, CheckCircle2, GraduationCap } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { getProduct } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TutorialOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/products');
  await requireVerifiedArtisan(session.id);

  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product || product.artisan_id !== session.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-semibold text-ochre-800">Product and photos saved</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900">
        Would you like to add a tutorial?
      </h1>
      <p className="mt-3 leading-6 text-stone-600">
        Offer a tutorial for “{product.name}” so people can learn how to make it. You can also skip this and add it later.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/artisan/products/${product.id}/tutorial`}
          className="rounded-2xl border border-ochre-300 bg-ochre-50 p-5 transition hover:border-ochre-500 hover:bg-ochre-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <GraduationCap size={24} className="text-ochre-900" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">Yes, add a tutorial</h2>
          <p className="mt-1 text-sm leading-5 text-stone-600">Add what learners will do, the fee, and a session time.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
            Enter tutorial details <CalendarDays size={16} aria-hidden="true" />
          </span>
        </Link>

        <Link
          href="/artisan/products"
          className="rounded-2xl border border-abaca-200 bg-white p-5 transition hover:border-brand-300 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <CheckCircle2 size={24} className="text-brand-700" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">No, finish without one</h2>
          <p className="mt-1 text-sm leading-5 text-stone-600">Your craft and photos are saved. You can set up a tutorial later.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
            Finish and go to my products <CheckCircle2 size={16} aria-hidden="true" />
          </span>
        </Link>
      </section>
    </main>
  );
}
