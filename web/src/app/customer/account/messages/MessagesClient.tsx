'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Reply, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Conv { id: number; counterpart: string; product_id: number | null; product_name: string | null }
interface Msg {
  id: number;
  sender_role: string;
  message: string;
  product_id: number | null;
  product_name: string | null;
  reply_to_message_id: number | null;
  reply_to_message: string | null;
  reply_to_sender_role: string | null;
  created_at: string;
}

export default function MessagesClient({
  role, conversations, initialConversationId,
}: {
  role: 'customer' | 'artisan';
  conversations: Conv[];
  initialConversationId: number | null;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  const [readError, setReadError] = useState('');
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const isArtisan = role === 'artisan';

  useEffect(() => {
    if (!isArtisan || conversations.length === 0) return;
    let active = true;
    async function markMessagesRead() {
      try {
        const response = await fetch('/api/chat/read', { method: 'POST' });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        if (active) router.refresh();
      } catch (error) {
        console.error('[artisan-messages] failed to mark messages read:', error);
        if (active) setReadError('Unread messages could not be cleared. Please try again.');
      }
    }
    void markMessagesRead();
    return () => { active = false; };
  }, [conversations.length, isArtisan, router]);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    async function poll() {
      const res = await fetch(`/api/chat/${activeId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (alive) setMessages(data.messages ?? []);
      }
    }
    poll();
    const t = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    setSendError('');
    try {
      const response = await fetch(`/api/chat/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          product_id: activeConversation?.product_id ?? undefined,
          reply_to_message_id: replyingTo?.id,
        }),
      });
      if (!response.ok) throw new Error('Message could not be sent.');
      setDraft('');
      setReplyingTo(null);
      const res = await fetch(`/api/chat/${activeId}/messages`);
      if (!res.ok) throw new Error('Message sent, but the conversation could not be refreshed.');
      setMessages((await res.json()).messages ?? []);
    } catch (error) {
      console.error('[messages] failed to send or refresh message:', error);
      setSendError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
    }
  }

  if (conversations.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
          <MessageCircle size={25} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-serif text-xl font-bold text-brand-900">
          {isArtisan ? 'Your conversations will appear here' : 'No conversations yet'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
          {isArtisan
            ? 'When a customer reaches out about your craft, you can reply here and keep the conversation going.'
            : 'Open a creation and choose “Message artisan” to ask a question.'}
        </p>
      </section>
    );
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.8fr)]">
      {readError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 lg:col-span-2">
          {readError}
        </p>
      )}
      <section aria-label={isArtisan ? 'Customer conversations' : 'Artisan conversations'} className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/90 shadow-sm">
        <div className="border-b border-abaca-100 px-4 py-4">
          <h2 className="font-serif text-lg font-bold text-brand-900">{isArtisan ? 'Your customers' : 'Your conversations'}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {isArtisan ? 'Choose a conversation to reply.' : 'Choose a conversation to continue.'}
          </p>
        </div>
        <div className="space-y-1 p-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setReplyingTo(null);
                setSendError('');
              }}
              aria-pressed={activeId === c.id}
              className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activeId === c.id ? 'border-brand-300 bg-ochre-50/80' : 'border-transparent bg-white hover:border-abaca-200 hover:bg-canvas'}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-serif text-sm font-bold ${activeId === c.id ? 'bg-brand-700 text-white' : 'bg-abaca-100 text-brand-900'}`} aria-hidden="true">
                {c.counterpart.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-800">{c.counterpart}</span>
                <span className="mt-1 block truncate text-xs text-stone-500">
                  {c.product_name ? `About ${c.product_name}` : 'Conversation'}
                </span>
              </span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${activeId === c.id ? 'bg-ochre-600' : 'bg-abaca-300'}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section aria-label="Message thread" className="relative flex h-[min(72vh,680px)] min-h-[460px] flex-col overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        {activeConversation && (
          <div className="flex items-center gap-3 border-b border-abaca-100 px-4 py-4 sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <MessageCircle size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-brand-900">{activeConversation.counterpart}</p>
              {activeConversation.product_name ? (
                activeConversation.product_id ? (
                  <a
                    href={`/customer/browse/${activeConversation.product_id}`}
                    className="mt-0.5 block truncate text-xs font-medium text-ochre-800 hover:underline"
                  >
                    {isArtisan ? 'Asking about: ' : 'About: '}{activeConversation.product_name}
                  </a>
                ) : (
                  <p className="mt-0.5 truncate text-xs font-medium text-ochre-800">
                    {isArtisan ? 'Asking about: ' : 'About: '}{activeConversation.product_name}
                  </p>
                )
              ) : (
                <p className="mt-0.5 text-xs text-stone-500">General conversation</p>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 space-y-4 overflow-y-auto bg-canvas/60 p-4 sm:p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === role ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%] ${m.sender_role === role ? 'rounded-br-md bg-brand-700 text-white' : 'rounded-bl-md border border-abaca-100 bg-white text-stone-800'}`}>
                {m.reply_to_message_id && (
                  <div className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${m.sender_role === role ? 'border-ochre-300 bg-white/10 text-white/85' : 'border-brand-500 bg-canvas text-stone-600'}`}>
                    <p className="font-semibold">
                      Replying to {m.reply_to_sender_role === role ? 'your message' : isArtisan ? 'customer' : 'artisan'}
                    </p>
                    <p className="mt-0.5 max-h-10 overflow-hidden whitespace-pre-line opacity-90">
                      {m.reply_to_message ?? 'Original message unavailable'}
                    </p>
                  </div>
                )}
                {m.product_name && (
                  m.product_id ? (
                    <a
                      href={`/customer/browse/${m.product_id}`}
                      className={`mb-2 block border-b pb-2 text-xs font-bold ${m.sender_role === role ? 'border-white/30 text-white' : 'border-abaca-200 text-brand-700'}`}
                    >
                      Product: {m.product_name}
                    </a>
                  ) : (
                    <p className="mb-2 border-b border-white/30 pb-2 text-xs font-bold">
                      Product: {m.product_name}
                    </p>
                  )
                )}
                <p className="whitespace-pre-line">{m.message}</p>
                <p className={`mt-1 text-[10px] ${m.sender_role === role ? 'text-white/70' : 'text-stone-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(m);
                    setSendError('');
                    inputRef.current?.focus();
                  }}
                  aria-label={`Reply to ${m.sender_role === role ? 'your' : isArtisan ? 'customer' : 'artisan'} message`}
                  className={`mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400 ${m.sender_role === role ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-brand-700 hover:bg-ochre-50 hover:text-brand-900'}`}
                >
                  <Reply size={13} aria-hidden="true" />
                  Reply
                </button>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="m-auto rounded-xl border border-abaca-100 bg-white/80 px-4 py-3 text-center text-sm text-stone-500">
              {isArtisan ? 'Start by greeting your customer.' : 'No messages yet — say hello!'}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
        {sendError && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">{sendError}</p>}
        <form onSubmit={send} className="flex items-end gap-2 border-t border-abaca-100 bg-white p-3 sm:p-4">
          {replyingTo && (
            <div className="absolute bottom-[4.5rem] left-4 right-4 rounded-xl border border-abaca-200 bg-white p-3 shadow-lg sm:left-auto sm:right-6 sm:w-[min(28rem,calc(100%-3rem))]">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-900">
                    Replying to {replyingTo.sender_role === role ? 'your message' : isArtisan ? 'customer' : 'artisan'}
                  </p>
                  <p className="mt-1 truncate text-xs text-stone-500">{replyingTo.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  className="rounded-lg p-1 text-stone-500 hover:bg-canvas hover:text-brand-900"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            className="input min-h-11 flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isArtisan ? 'Write a friendly reply…' : 'Type a message…'}
            aria-label="Write a message"
          />
          <button className="btn-primary min-h-11 shrink-0 px-4" type="submit" disabled={!draft.trim()} aria-label="Send message">
            <Send size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
