import Link from 'next/link';
import WeaveDivider from '@/components/WeaveDivider';

type Step = 'account' | 'otp' | 'id' | 'details' | 'face' | 'credentials' | 'done';

/**
 * Top section of the artisan registration page, styled like the login card:
 * logo + brand name row, full-width weave band, then heading, description
 * and the progress steps.
 */
export default function ArtisanHeader({ step, compact = false }: { step: Step; compact?: boolean }) {
  if (compact) {
    return (
      <div className="overflow-hidden rounded-t-[18px] border border-b-0 border-stone-300 bg-white">
        <Link
          href="/"
          aria-label="Cultural Marketplace — home"
          className="flex items-center justify-center gap-2 px-4 py-3"
        >
          <img
            src="/images/cultural-marketplace-logo.png"
            alt="Cultural Marketplace Logo"
            className="h-8 w-auto max-w-[58px] object-contain"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <p className="text-[17px] font-extrabold tracking-tight">
              <span className="text-[#8B0000]">Cultural</span>{' '}
              <span className="text-[#FFA500]">Marketplace</span>
            </p>
            <p className="mt-0.5 text-[7px] font-bold text-[#B00000]">
              Agusan del Sur Indigenous Crafts and Experiences
            </p>
          </div>
        </Link>
        <WeaveDivider pattern="kalinga" className="!h-2" />
        <div className="px-5 pb-3 pt-4 text-center">
          <h1 className="font-serif text-[20px] font-bold leading-tight text-charcoal-900">
            {step === 'done' ? 'Verification Submitted' : 'Verified as an Artisan'}
          </h1>
          <p className="mx-auto mt-1 max-w-[365px] text-[10px] leading-[1.25] text-stone-600">
            {step === 'done'
              ? 'Your artisan verification is awaiting administrator review.'
              : 'Join our community of Indigenous artisans in Agusan del Sur. Verify your identity as an Indigenous artisan, share your traditional crafts, and showcase your skills while helping preserve the cultural heritage of your community.'}
          </p>
          <ol className="mt-4 grid grid-cols-5 gap-1.5 text-[7px] leading-tight">
            {([
              ['account', '1. Create Account'],
              ['id', '2. ID Validation'],
              ['details', '3. Applicant Details'],
              ['face', '4. Liveness and Face'],
              ['credentials', '5. Affiliation and Crafts'],
            ] as const).map(([id, label]) => {
              const active = step === id;
              const completed = step === 'done' || (
                ['account', 'id', 'details', 'face', 'credentials'].indexOf(step) >
                ['account', 'id', 'details', 'face', 'credentials'].indexOf(id)
              );
              return (
                <li
                  key={id}
                  aria-current={active ? 'step' : undefined}
                  className={`flex min-h-[19px] items-center justify-center rounded px-1 text-center ${
                    active
                      ? 'bg-crimson-700 font-bold text-white'
                      : completed
                        ? 'bg-red-100 text-crimson-700'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

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
          {step === 'account' ? 'Create an Artisan Account' : 'Complete Artisan Verification'}
        </h1>

        <p className="mx-auto mt-3 max-w-md font-sans text-xs leading-relaxed text-stone-500 sm:text-sm">
          Join our community of Indigenous artisans in Agusan del Sur. Share
              your traditional crafts, showcase your skills, and offer cultural
              workshops to people who want to learn about your heritage.
              </p>

        <ol className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          {([
            ['account', '1. Create Account'],
            ['id', '2. ID Validation'],
            ['details', '3. Applicant Details'],
            ['face', '4. Liveness & Face'],
            ['credentials', '5. Affiliation & Craft'],
          ] as const).map(([id, label]) => {
            const active = step === id || (step === 'otp' && id === 'account');
            const completed = step === 'done' || (
              ['account', 'id', 'details', 'face', 'credentials'].indexOf(step) >
              ['account', 'id', 'details', 'face', 'credentials'].indexOf(id)
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
