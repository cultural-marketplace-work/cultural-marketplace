
import { getAllSettings } from '@/lib/db';
import SettingsClient from './SettingsClient';
import { Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getAllSettings();

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
            <Settings size={15} aria-hidden="true" />
            Marketplace management
          </p>

          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
            Platform Settings
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            Manage your marketplace information, commission rates, shipping
            fees, and platform policies.
          </p>
        </div>
      </header>

      <SettingsClient
        initial={{
          platform_name: settings.platform_name ?? '',
          commission_rate: settings.commission_rate ?? '5',
          contact_email: settings.contact_email ?? '',
          shipping_fee: settings.shipping_fee ?? '',
          terms_conditions: settings.terms_conditions ?? '',
          privacy_policy: settings.privacy_policy ?? '',
        }}
      />
    </main>
  );
}
