
import { getSession } from '@/lib/auth';
import ProfileClient from './ProfileClient';
import { UserRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  const session = await getSession();

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

        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
            <UserRound size={15} aria-hidden="true" />
            Account management
          </p>

          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            View and manage your administrator account information.
          </p>
        </div>
      </header>

      <ProfileClient
        initial={{
          name: session?.name ?? '',
          email: session?.email ?? '',
        }}
      />
    </main>
  );
}
