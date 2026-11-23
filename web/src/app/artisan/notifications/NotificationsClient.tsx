'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationsClient({ initial }: { initial: Array<{ id: number; message: string; is_read: boolean; created_at: string }> }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoMarkStarted = useRef(false);

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
    <div className="mt-6 space-y-3">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {items.some((n) => !n.is_read) && (
        <button className="btn-outline" disabled={busy} onClick={() => void markAllRead()}>Mark all as read</button>
      )}
      {items.map((n) => (
        <div key={n.id} className={`card p-4 ${n.is_read ? 'opacity-60' : 'border-l-4 border-brand-500'}`}>
          <p className="text-sm text-stone-700">{n.message}</p>
          <p className="mt-1 text-xs text-stone-400">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      ))}
      {items.length === 0 && <p className="text-stone-500">No notifications yet.</p>}
    </div>
  );
}
