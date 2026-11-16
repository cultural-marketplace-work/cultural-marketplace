import Link from 'next/link';
import WeaveDivider from '@/components/WeaveDivider';
import CustomerRegisterForm from './CustomerRegisterForm';

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-3 py-6 sm:px-4 sm:py-8">
      {/* Registration Card */}
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-stone-300 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)]">

        {/* Logo and Brand Name (links back to the storefront) */}
        <Link
          href="/"
          aria-label="Cultural Marketplace — home"
          className="flex flex-wrap items-center justify-center gap-3 px-5 py-3 sm:py-4"
        >
          <img
            src="/images/cultural-marketplace-logo.png"
            alt="Cultural Marketplace Logo"
            className="h-8 w-auto max-w-[90px] object-contain sm:h-10 sm:max-w-[100px]"
          />

          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight sm:text-[24px]">
              <span className="text-[#8B0000]">Cultural</span>{' '}
              <span className="text-[#FFA500]">Marketplace</span>
            </h1>

            <p className="mt-0.5 text-[9px] font-bold text-[#B00000] sm:text-[10px]">
              Agusan del Sur Indigenous Crafts and Experiences
            </p>
          </div>
        </Link>

        <WeaveDivider pattern="kalinga" />

        {/* Body */}
        <div className="px-4 pb-6 pt-4 sm:px-7 sm:pb-7">

          {/* Page Heading */}
          <div className="text-center">
            <h2 className="font-sculpted text-xl font-bold text-charcoal-900 sm:text-2xl">
              Join the Community
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-stone-500 sm:text-xs">
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
          <p className="mt-5 text-center text-xs leading-relaxed text-stone-500 sm:text-sm">
            Already have an account?{' '}
            <Link
              className="font-medium text-crimson-700 underline transition hover:text-crimson-800"
              href="/auth/login"
            >
              Log in
            </Link>
          </p>
        </div>
        
      </div>
            {/* RETURN TO STOREFRONT - BELOW REGISTRATION CARD */}
      <div className="absolute bottom-4 left-0 w-full text-center sm:bottom-6">
        <Link
          href="/"
          className="text-xs font-semibold text-stone-500 transition hover:text-charcoal-900 sm:text-sm"
        >
          ← Return to Storefront
        </Link>
      </div>
      
    </main>
  );
}
