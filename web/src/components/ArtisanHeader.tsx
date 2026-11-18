import Link from 'next/link';
import WeaveDivider from '@/components/WeaveDivider';

type Step = 'id' | 'details' | 'face' | 'credentials' | 'done';

/**
 * Top section of the artisan registration page, styled like the login card:
 * logo + brand name row, full-width weave band, then heading, description
 * and the progress steps.
 */
export default function ArtisanHeader({ step }: { step: Step }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-stone-300 bg-white">
      {/* Logo and Brand Name (links back to the storefront) */}
      <Link
        href="/"
        aria-label="Cultural Marketplace — home"
        className="flex flex-wrap items-center justify-center gap-3 px-6 py-4 sm:py-5"
      >
        <img
          src="/images/cultural-marketplace-logo.png"
          alt="Cultural Marketplace Logo"
          className="h-10 w-auto max-w-[110px] object-contain sm:h-12 sm:max-w-[130px]"
        />

        <div className="flex min-w-0 flex-col leading-tight">
          <p className="text-xl font-extrabold tracking-tight sm:text-[28px]">
            <span className="text-[#8B0000]">Cultural</span>{' '}
            <span className="text-[#FFA500]">Marketplace</span>
          </p>

          <p className="mt-0.5 text-[10px] font-bold text-[#B00000] sm:text-[11px]">
            Agusan del Sur Indigenous Crafts and Experiences
          </p>
        </div>
      </Link>

      {/* Full-width weave band under the header */}
      <WeaveDivider pattern="kalinga" />

      {/* Body */}
      <div className="px-5 pb-7 pt-6 text-center sm:px-9 sm:pb-8 sm:pt-8">
        <h1 className="font-sculpted text-2xl font-bold text-charcoal-900 sm:text-3xl">
          Register as an Artisan
        </h1>

        <p className="mx-auto mt-3 max-w-md font-sans text-xs leading-relaxed text-stone-500 sm:text-sm">
          Join our community of Indigenous artisans in Agusan del Sur. Share
              your traditional crafts, showcase your skills, and offer cultural
              workshops to people who want to learn about your heritage.
              </p>

        <ol className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {([
            ['id', '1. ID Validation'],
            ['details', '2. Applicant Details'],
            ['face', '3. Liveness & Face'],
            ['credentials', '4. Affiliation & Craft'],
          ] as const).map(([id, label]) => {
            const active = step === id;
            const completed = step === 'done' || (
              ['id', 'details', 'face', 'credentials'].indexOf(step) >
              ['id', 'details', 'face', 'credentials'].indexOf(id)
            );
            return (
              <li
                key={id}
                aria-current={active ? 'step' : undefined}
                className={`badge justify-center ${
                  active
                    ? 'bg-crimson-600 font-bold text-white'
                    : completed
                      ? 'bg-ochre-100 text-ochre-800'
                      : 'bg-stone-100 text-stone-400'
                }`}
              >
                {label}
              </li>
            );
          })}
        </ol>
        {step === 'done' && (
          <p className="mt-3 text-xs font-semibold text-ochre-800" role="status">
            Application submitted — pending admin review
          </p>
        )}
      </div>
    </div>
  );
}
