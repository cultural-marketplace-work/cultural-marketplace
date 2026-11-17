import Link from 'next/link';
import WeaveDivider from '@/components/WeaveDivider';
import CustomerRegisterForm from './CustomerRegisterForm';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-3 py-6">
      {/* Registration Card */}
      <div className="w-full max-w-[280px] overflow-hidden rounded-[14px] border border-stone-300 bg-white">
        {/* Logo and Brand Name (links back to the storefront) */}
        <Link
          href="/"
          aria-label="Cultural Marketplace — home"
          className="flex items-center justify-center gap-1.5 px-3 py-2"
        >
          <img
            src="/images/cultural-marketplace-logo.png"
            alt="Cultural Marketplace Logo"
            className="h-6 w-auto max-w-[64px] object-contain"
          />

          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="text-[12px] font-extrabold tracking-tight">
              <span className="text-[#8B0000]">Cultural</span>{' '}
              <span className="text-[#FFA500]">Marketplace</span>
            </h1>

            <p className="mt-0.5 text-[5px] font-bold text-[#B00000]">
              Agusan del Sur Indigenous Crafts and Experiences
            </p>
          </div>
        </Link>

        <WeaveDivider pattern="kalinga" className="!h-2" />

        {/* Body */}
        <div className="px-4 pb-3 pt-3">
          {/* Page Heading */}
          <div className="text-center">
            <h2 className="font-serif text-[15px] font-bold leading-tight text-charcoal-900">
              Join Our Community
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[7px] leading-[1.4] text-stone-500">
              Create your patron account to support Indigenous artisans,
              collect authentic crafts, and participate in living cultural
              workshops.
            </p>
          </div>

          {/* Registration Form */}
          <div className="w-full min-w-0">
            <CustomerRegisterForm />
          </div>

          {/* Sign In Link */}
          <p className="mt-2 text-center text-[7px] leading-tight text-stone-500">
            Already have an account?{' '}
            <Link
              className="font-medium text-crimson-700 underline transition hover:text-crimson-800"
              href="/auth/login"
            >
              Log in
            </Link>
          </p>
          <p className="mt-0.5 text-center text-[7px] leading-tight text-stone-500">
            <Link
              href="/"
              className="font-medium text-stone-600 underline transition hover:text-charcoal-900"
            >
              Return to Marketplace
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
