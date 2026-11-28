import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSession } from '@/lib/auth';
import { getProduct, getArtisan, listProductReviews } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';
import ProductGallery from './ProductGallery';
import { ProductVariationImageProvider } from './ProductVariationImageContext';
import ReviewList from './ReviewList';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const [product, session] = await Promise.all([getProduct(productId), getSession()]);
  if (!product || product.status !== 'active') notFound();

  const [artisan, reviews] = await Promise.all([
    getArtisan(product.artisan_id),
    listProductReviews(product.id),
  ]);
  const productReviews = reviews.filter((review) => review.purchase_type !== 'workshop');
  const workshopReviews = reviews.filter((review) => review.purchase_type === 'workshop');
  const tutorialImages = product.has_tutorial ? product.tutorial_gallery ?? [] : [];
  const mainImage = product.image_path ?? tutorialImages[0] ?? null;
  const variationImages = (product.variations_data ?? [])
    .map((variation) => variation.image_path)
    .filter((image): image is string => Boolean(image));
  const gallery = [...tutorialImages, ...(product.product_gallery ?? []), ...variationImages]
    .filter((image, index, images) => image !== mainImage && images.indexOf(image) === index);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ProductVariationImageProvider>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/customer/browse"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-abaca-200 bg-white px-3.5 text-sm font-semibold text-charcoal-700 transition hover:border-ochre-400 hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-600"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to crafts
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-500">
            Cultural Marketplace <span className="px-1 text-ochre-700">/</span>{' '}
            {product.category || 'Handcrafted'}
          </p>
        </div>

        <div className={`grid items-start gap-5 lg:gap-6 ${product.has_tutorial ? 'lg:grid-cols-[minmax(0,1.7fr)_minmax(310px,0.9fr)]' : 'mx-auto w-full max-w-4xl lg:grid-cols-1'}`}>
          <div className="min-w-0">
          <section className="overflow-hidden rounded-2xl border border-abaca-200 border-t-2 border-t-crimson-700 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(220px,0.95fr)]">
              <ProductGallery
                main={mainImage}
                gallery={gallery}
                name={product.name}
                hasTutorial={product.has_tutorial}
              />

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  {product.category && (
                    <span className="rounded-full border border-abaca-200 bg-abaca-50 px-2.5 py-1 text-xs font-bold text-charcoal-700">
                      {product.category}
                    </span>
                  )}
                  {product.nfc_tag_id && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ochre-300 bg-ochre-50 px-2.5 py-1 text-xs font-bold text-ochre-900">
                      <ShieldCheck size={14} aria-hidden="true" />
                      NFC tagged
                    </span>
                  )}
                </div>

                <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-charcoal-900 sm:text-3xl">
                  {product.name}
                </h1>
                <p className="mt-1 text-lg font-bold text-crimson-700">
                  ₱{Number(product.price).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-xs font-semibold text-ochre-800">
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} available`
                    : 'Made to order'}
                </p>

                <ProductDetailClient
                  product={product}
                  loggedIn={session?.role === 'customer'}
                  view="product"
                />
              </div>
            </div>

            {product.description && (
              <div className="mt-5 border-t border-abaca-200 pt-4">
                <h2 className="text-sm font-bold text-charcoal-900">Description</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-charcoal-600">
                  {product.description}
                </p>
              </div>
            )}

            {product.materials_used && (
              <div className="mt-4 rounded-xl border border-abaca-200 bg-canvas/70 px-3.5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal-600">Materials</p>
                <p className="mt-1 text-sm leading-5 text-charcoal-800">{product.materials_used}</p>
              </div>
            )}

            <div className="mt-4 flex justify-end border-t border-abaca-200 pt-3">
              <Link
                href={`/customer/account/report?type=product&id=${product.id}`}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-crimson-700 transition hover:bg-crimson-50"
              >
                Report this product
              </Link>
            </div>
          </section>

          {artisan && (
            <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-abaca-200 border-l-4 border-l-ochre-500 bg-white px-4 py-3 shadow-sm sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                {artisan.profile_picture ? (
                  <img
                    src={artisan.profile_picture}
                    alt=""
                    className="h-11 w-11 rounded-full border border-ochre-200 object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ochre-200 bg-ochre-50 font-serif text-lg font-bold text-crimson-700">
                    {artisan.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-charcoal-500">Made with care in Agusan del Sur</p>
                  <Link
                    href={`/artisans/${artisan.id}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-charcoal-900 hover:text-crimson-700"
                  >
                    {artisan.name}
                    {artisan.verification_status === 'approved' && (
                      <CheckCircle2 size={14} className="text-emerald-700" aria-label="Verified artisan" />
                    )}
                  </Link>
                </div>
              </div>
            </section>
          )}
          </div>

          {product.has_tutorial && (
            <ProductDetailClient
              product={product}
              loggedIn={session?.role === 'customer'}
              view="workshop"
              artisanPhone={artisan?.phone}
            />
          )}
        </div>

        <section className={`mx-auto mt-8 w-full ${product.has_tutorial ? '' : 'max-w-4xl'}`}>
          <h2 className="mb-4 font-serif text-2xl font-bold text-charcoal-900">Customer experiences</h2>
          <div className={`grid gap-5 ${product.has_tutorial ? 'lg:grid-cols-[minmax(0,1.7fr)_minmax(310px,0.9fr)]' : 'md:grid-cols-1'}`}>
            <section className="min-h-52 rounded-2xl border border-abaca-200 border-t-2 border-t-crimson-700 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="border-b border-crimson-700/30 pb-2 font-serif text-lg font-bold text-charcoal-900">
                Product feedback
              </h3>
              <ReviewList reviews={productReviews} empty="No craft reviews yet." />
            </section>
            {product.has_tutorial && (
              <section className="min-h-52 rounded-2xl border border-abaca-200 border-t-2 border-t-ochre-500 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="border-b border-ochre-500/50 pb-2 font-serif text-lg font-bold text-charcoal-900">
                  Workshop Experience
                </h3>
                <ReviewList reviews={workshopReviews} empty="No workshop comments yet." />
              </section>
            )}
          </div>
        </section>
        </ProductVariationImageProvider>
      </main>

      <Footer />
    </div>
  );
}
