import { getAllSettings } from '@/lib/db';
import HomepageClient from './HomepageClient';
import { Megaphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminHomepagePage() {
  const settings = await getAllSettings();

  let announcements: Array<{ date: string; type: string; message: string }> = [];

  try {
    announcements = JSON.parse(settings.homepage_announcements ?? '[]');
  } catch {
    // Ignore invalid announcement data.
  }

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
              <Megaphone size={15} aria-hidden="true" />
              Homepage management
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Homepage &amp; Announcements
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Manage homepage banners, update important announcements, and keep
              marketplace visitors informed.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            Homepage settings
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <HomepageClient
          initial={{
            homepage_banner_title: settings.homepage_banner_title ?? '',
            homepage_banner_subtitle: settings.homepage_banner_subtitle ?? '',
            contact_email: settings.contact_email ?? '',
          }}
          announcements={announcements}
        />
      </div>
    </main>
  );
}