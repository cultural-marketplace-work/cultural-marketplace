'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function notificationIcon(type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('order') || normalizedType.includes('payment')) return Package;
  if (normalizedType.includes('booking') || normalizedType.includes('tutorial') || normalizedType.includes('workshop')) return CalendarDays;
  if (normalizedType.includes('message') || normalizedType.includes('chat')) return MessageCircle;
  if (normalizedType.includes('shipment') || normalizedType.includes('ship')) return Package;
  if (normalizedType.includes('verification') || normalizedType.includes('identity')) return ShieldCheck;
  if (normalizedType.includes('payout') || normalizedType.includes('earning')) return CircleDollarSign;
  return Bell;
}

export default function NotificationsClient({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoMarkStarted = useRef(false);
  const unreadCount = items.filter((item) => !item.is_read).length;

  const markAllRead = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/notifications/read', { method: 'POST' });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      setItems((list) => list.map((n) => ({ ...n, is_read: true })));
      router.refresh();
    } catch (cause) {
      console.error('[artisan-notifications] failed to mark notifications read:', cause);
      setError('Notifications could not be marked as read. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    if (autoMarkStarted.current || !initial.some((notification) => !notification.is_read)) return;
    autoMarkStarted.current = true;
    void markAllRead();
  }, [initial, markAllRead]);

  return (
    <div className="mt-6 space-y-5">
      <section aria-label="Notification summary" className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Bell size={19} aria-hidden="true" />
            </span>
            <span className="font-serif text-3xl font-bold text-brand-900">{items.length}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-stone-800">Recent updates</p>
          <p className="mt-1 text-xs text-stone-500">Notifications currently shown here</p>
        </div>
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Sparkles size={19} aria-hidden="true" />
            </span>
            <span className="font-serif text-3xl font-bold text-brand-900">{unreadCount}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-stone-800">New updates</p>
          <p className="mt-1 text-xs text-stone-500">Waiting for you to catch up</p>
        </div>
      </section>

      <section aria-label="Notifications" className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-abaca-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Recent activity</h2>
            <p className="mt-1 text-xs text-stone-500">
              {items.length} {items.length === 1 ? 'update' : 'updates'} · New notifications are marked as read when opened.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn-outline min-h-10 px-3 text-xs"
              disabled={busy}
              onClick={() => void markAllRead()}
            >
              <CheckCheck size={15} aria-hidden="true" />
              {busy ? 'Updating…' : 'Mark all as read'}
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-5">
            <Clock3 size={16} aria-hidden="true" />
            {error}
          </p>
        )}

        {items.length > 0 ? (
          <div className="divide-y divide-abaca-100">
            {items.map((item) => {
              const Icon = notificationIcon(item.type);
              const date = new Date(item.created_at);
              return (
                <article key={item.id} className={`flex gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-5 ${item.is_read ? 'bg-white' : 'bg-ochre-50/50'}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.is_read ? 'bg-canvas text-stone-500' : 'bg-ochre-100 text-ochre-900'}`}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ochre-800">
                        {item.type.replace(/[_-]+/g, ' ')}
                      </span>
                      {!item.is_read && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ochre-300 bg-ochre-100 px-2 py-0.5 text-[10px] font-bold text-ochre-900">
                          <span className="h-1.5 w-1.5 rounded-full bg-crimson-600" aria-hidden="true" />
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-stone-800">{item.message}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                      <Clock3 size={13} aria-hidden="true" />
                      <time dateTime={item.created_at}>
                        {Number.isNaN(date.getTime()) ? item.created_at : date.toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                    </p>
                  </div>
                  {item.is_read && (
                    <span className="mt-1 flex shrink-0 items-center gap-1 text-[10px] font-semibold text-stone-400">
                      <Check size={14} aria-hidden="true" />
                      <span className="sr-only">Read</span>
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Bell size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">You’re all caught up</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Updates about your creations, orders, workshops, and community will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
