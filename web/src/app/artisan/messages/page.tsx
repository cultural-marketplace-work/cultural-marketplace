import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listConversations } from '@/lib/db';
import MessagesClient from '@/app/customer/account/messages/MessagesClient';
import { MessageCircle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanMessagesPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/messages');
  await requireVerifiedArtisan(session.id);

  const conversations = await listConversations({ id: session.id, role: 'artisan' });
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <Sparkles size={14} aria-hidden="true" />
              Community
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Conversations with customers</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Answer questions, share the story behind your creations, and help each customer choose with confidence.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <MessageCircle size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>
      <MessagesClient
        role="artisan"
        conversations={conversations}
        initialConversationId={conversations[0]?.id ?? null}
      />
    </div>
  );
}
