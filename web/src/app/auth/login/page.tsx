import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import WeaveDivider from '@/components/WeaveDivider';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(
      session.role === 'admin'
        ? '/admin/dashboard'
        : session.role === 'artisan'
        ? '/artisan/dashboard'
        : '/customer/account/dashboard'
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-3 py-8">
      {/* Login Card */}
      <div className="w-full max-w-[335px] overflow-hidden rounded-[18px] border border-stone-300 bg-white">
        {/* Logo and Brand Name (links back to the storefront) */}
        <Link
          href="/"
          aria-label="Cultural Marketplace — home"
          className="flex items-center justify-center gap-2 px-4 py-2.5"
        >
          <img
            src="/images/cultural-marketplace-logo.png"
            alt="Cultural Marketplace Logo"
            className="h-7 w-auto max-w-[74px] object-contain"
          />

          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="text-[15px] font-extrabold tracking-tight">
              <span className="text-[#8B0000]">Cultural</span>{' '}
              <span className="text-[#FFA500]">Marketplace</span>
            </h1>

            <p className="mt-0.5 text-[6px] font-bold text-[#B00000]">
              Agusan del Sur Indigenous Crafts and Experiences
            </p>
          </div>
        </Link>

        <WeaveDivider pattern="kalinga" className="!h-2" />

        {/* Body */}
        <div className="px-5 pb-5 pt-4">
          {/* Page Heading */}
          <div className="text-center">
            <h2 className="font-serif text-[18px] font-bold leading-tight text-charcoal-900">
              Welcome to our Community!
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[9px] leading-[1.4] text-stone-500">
              Explore authentic Indigenous crafts, learn about their cultural
              stories, and connect with local artisans. Sign in to access your
              account and enjoy all the features of our marketplace.
            </p>
          </div>

          {/* Login Form */}
          <div className="mt-6 w-full min-w-0">
            <LoginForm />
          </div>

          {/* Register Links */}
          <div className="mt-2 space-y-0.5 text-center text-[8px] leading-snug text-stone-500">
            <p>
              New to our marketplace?{' '}
              <Link
                className="text-stone-600 underline transition hover:text-crimson-700"
                href="/auth/register"
              >
                Create a Buyer Account
              </Link>
            </p>

            <p>
              <Link
                className="text-stone-600 underline transition hover:text-crimson-700"
                href="/auth/register-artisan"
              >
                Register as an Artisan
              </Link>
              {' · '}
              <Link
                className="text-stone-600 underline transition hover:text-crimson-700"
                href="/auth/forgot-password"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
