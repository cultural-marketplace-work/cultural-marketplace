import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { BadgeCheck, CalendarDays, Compass, Fingerprint, Flower2, Gem, Handbag, Leaf, Palette, ScrollText, ShieldCheck, ShoppingBag, Sparkles, Trees, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageLoading from '@/components/PageLoading';
import ProductCard from '@/components/ProductCard';
import FeaturedCarousel from './FeaturedCarousel';
import { listActiveProducts, getSettings, listCategories, getProductRatingStats, listApprovedArtisans } from '@/lib/db';

export const dynamic = 'force-dynamic';

function CategoryIcon({ name }: { name: string }): ReactNode {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  const iconClass = 'h-8 w-8 text-[#111111]';

  const categoryIcons: Record<string, LucideIcon> = {
    weaving: Sparkles,
    basketry: Flower2,
    leatherwork: Gem,
    embroidery: Palette,
    bambocrafts: Trees,
    uwaycrafts: Leaf,
    bags: Handbag,
    other: ScrollText,
  };

  const Icon = categoryIcons[normalized] ?? ShoppingBag;

  return <Icon className={iconClass} strokeWidth={1.8} aria-hidden="true" />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading label="homepage" />}>
      <HomePageContent />
    </Suspense>
  );
}

async function HomePageContent() {
  const [products, settings, categories, ratings, artisans] = await Promise.all([
    listActiveProducts(),
    getSettings(),
    listCategories('product'),
    getProductRatingStats(),
    listApprovedArtisans(),
  ]);

  // Highest average rating first; ties go to the product with more reviews
  const featured = [...products]
    .sort((a, b) => {
      const ra = ratings[a.id];
      const rb = ratings[b.id];
      return (rb?.avg ?? 0) - (ra?.avg ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0);
    })
    .slice(0, 12);
  const workshopCrafts = products.filter((p) => p.has_tutorial).slice(0, 3);
  const artisanById = new Map(artisans.map((a) => [a.id, a]));
  const homepageBannerTitle = settings.homepage_banner_title?.trim();
  const homepageBannerSubtitle = settings.homepage_banner_subtitle?.trim();
  const useDefaultHeroTitle =
    !homepageBannerTitle ||
    homepageBannerTitle === 'Discover Authentic Indigenous Crafts & Experiences' ||
    homepageBannerTitle === 'Discover Authentic Indigenous Crafts and Cultural Experiences in Agusan del Sur.';
  const useDefaultHeroSubtitle =
    !homepageBannerSubtitle ||
    homepageBannerSubtitle === 'Supporting Agusan del Sur Artisans and Preserving Cultural Heritage' ||
    homepageBannerSubtitle ===
      'Every handcrafted piece carries a story, a tradition, and the artistry of Indigenous communities. Shop authentic products directly from verified artisans while helping preserve their culture for future generations.';
  const marketplaceReasons = [
    {
      title: 'Authentic Indigenous Products',
      description: 'Every product is handcrafted by verified Indigenous artisans from Agusan del Sur, ensuring each purchase supports genuine craftsmanship and cultural heritage.',
      image: '/images/crafts/basket.jpg',
      alt: 'Handwoven indigenous basket',
    },
    {
      title: 'Verified Artisans',
      description: 'Our verification process helps ensure products are created by legitimate Indigenous artisans, giving buyers confidence in every purchase.',
      image: '/images/crafts/headdress.jpg',
      alt: 'Artisan wearing a traditional beaded headdress',
    },
    {
      title: 'Support Local Communities',
      description: 'Your purchase directly contributes to the livelihood of Indigenous families and helps preserve traditional skills passed down through generations.',
      image: '/images/crafts/bag.jpg',
      alt: 'Indigenous artisans making beaded crafts together',
    },
    {
      title: 'Cultural Experiences',
      description: 'Go beyond shopping. Join hands-on workshops and cultural activities to learn how traditional crafts are made from the artisans themselves.',
      image: '/images/crafts/cloth.jpg',
      alt: 'Traditional woven indigenous garment',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas font-[var(--font-poppins)] [&_.font-sans]:font-[var(--font-poppins)] [&_.font-serif]:font-[var(--font-poppins)] [&_.font-mono]:font-[var(--font-poppins)]">
      <Header />

      {/* Hero Section */}
<section
  className="relative isolate flex min-h-[calc(100dvh-11rem)] flex-col overflow-hidden border-b border-abaca-200/80 bg-[#F5EBDD] md:min-h-[calc(100dvh-8rem)] xl:min-h-[calc(100dvh-5rem)]"
  style={{
    backgroundImage: "url('/images/homepage-background.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
  <div
    className="absolute inset-0 z-0 bg-gradient-to-r from-black/75 via-black/45 to-black/5"
    aria-hidden="true"
  />

  <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center px-3 py-3 sm:px-8 sm:py-16">
    <div className="max-w-[520px] text-left">
      <h1 className="font-sculpted max-w-[500rem] text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-[1.2] tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)] sm:text-5xl sm:leading-[1.1] md:text-[3rem]">
        {useDefaultHeroTitle ? (
          <>
            Discover Authentic Indigenous Crafts and Cultural Experiences in<br />
            <span>
              <span className="text-[#A50000]">A</span>
              <span className="text-[#F2B51C]">G</span>
              <span className="text-[#111111] drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]">U</span>
              <span className="text-white">S</span>
              <span className="text-[#A50000]">A</span>
              <span className="text-[#F2B51C]">N</span>
              {' '}
              <span className="text-[#111111] drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]">D</span>
              <span className="text-white">E</span>
              <span className="text-[#A50000]">L</span>
              {' '}
              <span className="text-[#F2B51C]">S</span>
              <span className="text-[#111111] drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]">U</span>
              <span className="text-white">R</span>
              <span className="text-[#A50000]">.</span>
            </span>
          </>
        ) : homepageBannerTitle}
      </h1>

      <p className="mt-5 max-w-[470px] font-sans text-sm leading-relaxed text-white sm:text-base">
        {useDefaultHeroSubtitle
          ? 'Every handcrafted piece carries a story, a tradition, and the artistry of Indigenous communities. Shop authentic products directly from verified artisans while helping preserve their culture for future generations.'
          : homepageBannerSubtitle}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-start gap-4">
        <Link
          href="/customer/browse"
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#990000] bg-[#A50000] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#850000]"
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
          Explore Marketplace
        </Link>
        <Link
          href="/customer/browse?workshop=1"
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#F0C766] bg-[#FFF2C9] px-4 py-2 text-xs font-bold text-[#B77900] shadow-sm transition-colors hover:bg-[#FFE7A3]"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Book Cultural Experience
        </Link>
      </div>
    </div>
  </div>

</section>
      

      <main className="mx-auto max-w-6xl px-4 py-12 flex-1 w-full">
        <section className="mb-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold text-[#C5832B]">Why Us</p>
            <h2 className="mt-3 font-sculpted text-xl font-bold text-charcoal-900 sm:text-2xl">
              Why Choose Our <span className="text-[#C5832B]">Marketplace?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marketplaceReasons.map((reason) => (
              <article
                key={reason.title}
                className="group h-full overflow-hidden rounded-xl border border-[#D8D8D8] bg-white/70 p-4 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C5832B] hover:bg-[#FFF9F2] hover:shadow-[0_12px_24px_rgba(197,131,43,0.14)]"
              >
                <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg">
                  <Image
                    src={reason.image}
                    alt={reason.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
                <h3 className="text-xs font-bold text-[#C5832B] transition-colors duration-300 group-hover:text-[#A50000]">{reason.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600 transition-colors duration-300 group-hover:text-stone-800">{reason.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Category Weave Pills */}
        <div className="mb-12">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#D9CCBA] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ochre-600 block">
                Categories
              </span>
              <h2 className="font-sculpted text-2xl font-bold text-charcoal-900 sm:text-1xl">
                Traditional Craft Categories
              </h2>
            </div>

            <Link
              href="/customer/browse"
              className="text-base font-medium text-[#990000] transition-colors hover:text-[#C5832A] sm:text-lpx"
            >
              View all categories...
            </Link>
          </div>

          <div className="touch-scroll flex snap-x snap-mandatory flex-nowrap justify-start gap-4 overflow-x-auto overscroll-x-contain pb-2 sm:gap-5">
            {categories
              .filter((c) => c.name.toLowerCase() !== 'other')
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/customer/browse?category=${encodeURIComponent(c.name)}`}
                  className="flex h-28 w-[130px] shrink-0 snap-start items-center justify-center rounded-[20px] border border-[#D7CFBF] bg-white px-3 text-center text-base font-medium text-[#211B17] shadow-[0_1px_0_rgba(255,255,255,0.8)] transition duration-200 hover:-translate-y-0.5 hover:border-[#C99B50] hover:bg-[#FFF9F2] sm:h-28 sm:w-[160px]"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F6F5F3]">
                      <CategoryIcon name={c.name} />
                    </div>
                    <span className="leading-tight">{c.name}</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Featured Masterpieces */}
        <section className="mb-16">
          <div className="flex items-end justify-between border-b border-abaca-200 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ochre-600 block">
                Artisan Creations
              </span>
              <h2 className="font-sculpted text-2xl font-bold text-charcoal-900 sm:text-1xl">
                Featured Cultural Crafts
              </h2>
            </div>
            <Link href="/customer/browse" className="text-base font-medium text-[#990000] transition-colors hover:text-[#C5832A] sm:text-lpx">
              Browse Crafts...
            </Link>
          </div>

                    <div className="mt-8">
            <FeaturedCarousel>
              {featured.map((p, i) => (
                <div
                  key={p.id}
                  className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4.5rem)/4)]"
                >
                  <ProductCard product={p} priority={i < 4} />
                </div>
              ))}
            </FeaturedCarousel>
          </div>
        </section>

        {/* Living Cultural Workshops Spotlight */}
        {workshopCrafts.length > 0 && (
          <section className="mb-16 overflow-hidden rounded-3xl border border-[#E6A09A] bg-white/90 p-5 shadow-xs sm:p-8">
            <div className="flex items-start gap-4 border-b border-[#D8D8D8] pb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF4E4] text-[#A50000]" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
                  <path d="M4 5.5v16M8 7h8M8 10h8" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-sculpted text-xl font-bold text-charcoal-900 sm:text-1xl">
                    Learn from Skilled Indigenous Artisans
                  </h2>
                  <p className="mt-1 max-w-1px text-xs leading-relaxed text-stone-600 sm:text-sm">
                    Join hands-on workshops and learn traditional skills such as weaving, carving, and beadwork. Discover the stories and techniques behind each craft, guided by experienced Indigenous artisans.
                  </p>
                </div>
                <Link
                  href="/customer/browse?workshop=1"
                  className="text-base font-medium text-[#990000] transition-colors hover:text-[#C5832A] sm:text-lpx"
                >
                  more...
                </Link>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-stretch gap-4">
              {workshopCrafts.map((w) => {
                const artisan = artisanById.get(w.artisan_id);
                const firstSession = w.tutorial_dates?.[0];
                return (
                  <article
                    key={w.id}
                    className="w-full max-w-[190px] overflow-hidden rounded-2xl border border-[#E6DDC8] bg-[#FFFDF6] shadow-xs transition hover:-translate-y-0.5 hover:border-ochre-400 hover:shadow-md"
                  >
                    <Link href={`/customer/browse/${w.id}`} className="relative block aspect-[3/2] bg-abaca-100/60">
                      {w.image_path ? (
                        <Image
                          src={w.image_path}
                          alt={w.name}
                          fill
                          sizes="190px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center bg-gradient-to-br from-abaca-100 to-canvas text-4xl" aria-hidden="true">
                          🧺
                        </span>
                      )}
                    </Link>
                    <div className="p-2.5">
                      <Link
                        href={`/customer/browse/${w.id}`}
                        className="line-clamp-1 text-xs font-bold text-charcoal-900 hover:text-crimson-700"
                      >
                        {w.name}
                      </Link>
                      {w.description && (
                        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-stone-500">
                          {w.description}
                        </p>
                      )}

                      {artisan && (
                        <Link
                          href={`/artisans/${artisan.id}`}
                          className="mt-2 flex min-w-0 items-center gap-1.5 rounded border border-abaca-200 bg-white p-1"
                        >
                          {artisan.profile_picture ? (
                            <Image
                              src={artisan.profile_picture}
                              alt=""
                              width={20}
                              height={20}
                              className="h-5 w-5 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF4E4] text-[9px] font-bold text-[#8B0000]" aria-hidden="true">
                              {artisan.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="truncate text-[8px] font-semibold text-charcoal-900">{artisan.name}</span>
                        </Link>
                      )}

                      <div className="mt-2 border-t border-abaca-200 pt-1.5">
                        <h3 className="line-clamp-1 text-[10px] font-semibold text-charcoal-900">
                          {w.tutorial_title || w.name}
                        </h3>
                        {(firstSession?.date || firstSession?.location || w.tutorial_location) && (
                          <p className="mt-0.5 line-clamp-1 text-[8px] text-stone-500">
                            {[firstSession?.date, firstSession?.location || w.tutorial_location].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className="mt-1 flex items-baseline justify-between gap-1">
                          <span className="text-[10px] font-bold text-[#C5832B]">
                            {w.tutorial_fee_type === 'free'
                              ? 'FREE'
                              : `₱${Number(w.tutorial_price ?? w.price).toFixed(2)}`}
                          </span>
                          {w.tutorial_capacity != null && (
                            <span className="text-right text-[8px] text-stone-500">
                              {w.tutorial_capacity} seats
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/customer/browse/${w.id}`}
                          className="mt-1 block text-[9px] font-semibold text-crimson-700"
                        >
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Sacred Seal of Authenticity NFC Section */}
        <section className="mb-16 grid min-h-[290px] grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl border border-[#E6A09A] bg-white px-6 py-7 shadow-xs sm:px-8 md:grid-cols-[minmax(0,1.2fr)_minmax(200px,0.8fr)] md:gap-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#F0C766] bg-[#FFF2C9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#9A681D]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              NFC Verified
            </div>
            <p className="mt-3 text-xs font-bold text-[#C5832B]">Product Authenticity</p>
            <h2 className="border-b border-[#D8D8D8] pb-1 font-sculpted text-2xl font-bold text-[#45413D]">
              Verified Craft Authenticity
            </h2>
            <p className="mt-8 max-w-xl pl-4 text-xs leading-relaxed text-stone-600 sm:text-sm">
              Each verified craft includes information about its artisan and cultural background. Selected products can also be authenticated through NFC technology, allowing buyers to verify their origin and authenticity.
            </p>
          </div>
          <div className="flex items-center justify-center text-stone-600" aria-hidden="true">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#F0C766] bg-[#FFF8E8] shadow-[0_10px_25px_rgba(197,131,43,0.12)] sm:h-28 sm:w-28">
              <Fingerprint className="h-12 w-12 text-[#C5832B] sm:h-14 sm:w-14" strokeWidth={1.7} />
              <BadgeCheck className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-[#FFF8E8] bg-[#C5832B] p-1 text-white" strokeWidth={2} />
            </div>
          </div>
        </section>

        <section className="mb-8 flex min-h-[300px] flex-col items-center justify-center rounded-3xl px-5 py-12 text-center">
          <p className="text-xs font-bold text-[#C5832B]">Get Started</p>
          <h2 className="mt-4 font-sculpted text-xl font-bold leading-tight text-[#45413D] sm:text-2xl">
            Bring Home a Piece of
            <span className="mt-1 block text-[#C5832B]">Agusan del Sur</span>
          </h2>
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-stone-600 sm:text-sm">
            Every handcrafted product reflects the creativity, traditions, and identity of Indigenous communities. Shop authentic crafts, discover meaningful stories, and help preserve a rich cultural heritage with every purchase.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/customer/browse"
              className="inline-flex min-h-9 min-w-[124px] items-center justify-center gap-2 rounded-md border border-[#F0C766] bg-[#FFF2C9] px-4 py-2 text-xs font-bold text-[#B77900] transition-colors hover:bg-[#FFE7A3]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Shop Now
            </Link>
            <Link
              href="/customer/browse?workshop=1"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#ffa7a7] bg-[#F8B5B5] px-4 py-2 text-xs font-bold text-[#8B0000] transition-colors hover:bg-[#F49B9B]"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Explore Cultural Experiences
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
