'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { AlertTriangle, ArrowRight, BookOpen, Eye, Minus, Package, Plus, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';

export interface CartRow {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  variant: string | null;
  purchase_type: string;
  session?: object | null;
  image_path?: string | null;
  attendee_name?: string | null;
  attendee_for?: string | null;
}

// Last removed row, kept in memory so Undo can restore it without re-fetching.
let lastRemoved: CartRow | null = null;

type CartApiItem = {
  id: number;
  product_id: number;
  quantity: number;
  purchase_type: string;
  selected_variant?: string | null;
  selected_session?: object | null;
  attendee_name?: string | null;
  attendee_for?: string | null;
  product?: {
    name?: string | null;
    price?: number | string | null;
    tutorial_price?: number | string | null;
    image_path?: string | null;
    variations_data?: Array<{
      typeLabel: string;
      name: string;
      price?: number | string | null;
    }> | null;
  } | null;
};

export default function CartClient({ initialItems }: { initialItems: CartRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CartRow[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Real-time synchronization: guarantees the newly added product is visible immediately
  // without needing a manual browser refresh even if router cache was delayed.
  useEffect(() => {
    let mounted = true;
    async function syncCart() {
  try {
    const res = await fetch('/api/cart');
    const data = await res.json() as {
      status?: string;
      cart?: CartApiItem[];
    };

    if (mounted && data.status === 'success' && Array.isArray(data.cart)) {
      const mapped: CartRow[] = data.cart.map((i: CartApiItem) => {
            let itemPrice = Number(i.product?.price ?? 0);
            if (i.purchase_type === 'workshop') {
              itemPrice = Number(i.product?.tutorial_price ?? i.product?.price ?? 0);
            } else if (i.selected_variant && i.product?.variations_data) {
              const v = i.product.variations_data.find(
  (x) => `${x.typeLabel}: ${x.name}` === i.selected_variant
);
if (v && Number(v.price) > 0) itemPrice += Number(v.price);
            }
            return {
              id: i.id,
              product_id: i.product_id,
              quantity: i.quantity,
              name: i.product?.name ?? 'Unknown product',
              price: itemPrice,
              variant: i.selected_variant ?? null,
              purchase_type: i.purchase_type,
              session: i.selected_session,
              image_path: i.product?.image_path ?? null,
              attendee_name: i.attendee_name ?? null,
              attendee_for: i.attendee_for ?? null,
            };
          });
          setItems(mapped);
          setSelectedIds((prev) => {
  const next = new Set<number>();
  mapped.forEach((m) => {
    if (prev.has(m.id)) next.add(m.id);
  });
  return next;
});
        }
      } catch {
        // Fallback silently to initialItems
      }
    }
    syncCart();
    return () => { mounted = false; };
  }, []);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);

  function toggleItem(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  async function updateQty(id: number, quantity: number) {
    setBusy(true);
    setItems((list) => list.map((i) => (i.id === id ? { ...i, quantity } : i)));
    await fetch(`/api/cart/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove(id: number) {
    const removed = items.find((i) => i.id === id);
    setBusy(true);
    setItems((list) => list.filter((i) => i.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/cart/${id}`, { method: 'DELETE' });
    setBusy(false);
    lastRemoved = removed ?? null;
    router.refresh();
    if (removed) {
      toast.success('Removed from cart', { label: 'Undo', onClick: undoRemove });
    }
  }

  async function undoRemove() {
    const removed = lastRemoved;
    if (!removed) return;
    lastRemoved = null;
    setBusy(true);
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: removed.product_id,
        purchase_type: removed.purchase_type,
        quantity: removed.quantity,
        selected_variant: removed.variant,
        selected_session: removed.session ?? null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.status === 'success') {
      toast.success('Restored to your cart');
      router.refresh();
    } else {
      toast.error(data.message || 'Could not restore the item.');
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[#D8C8B5] bg-white px-5 py-14 text-center">
        <ShoppingCart size={40} aria-hidden="true" className="mx-auto text-[#80500D]" />
        <p className="mt-4 font-serif text-xl font-bold text-[#3D3028]">Your cart is empty.</p>
        <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#8B0000] px-5 text-xs font-bold text-white transition hover:bg-[#6F0000]" href="/customer/browse">
          Browse crafts <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Select All Bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-white p-4 shadow-sm">
        <label className="flex cursor-pointer select-none items-center gap-3 text-sm font-semibold text-[#3D3028]">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-[#D8C8B5] accent-[#8B0000] focus:ring-[#8B0000]"
            checked={isAllSelected}
            onChange={toggleAll}
          />
          <span>Select All Items ({items.length})</span>
        </label>
        <span className="text-right text-xs font-medium text-[#71675F]">
          {selectedIds.size} of {items.length} item{items.length === 1 ? '' : 's'} marked for checkout
        </span>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {items.map((i) => {
          const isSelected = selectedIds.has(i.id);
          return (
            <div
              key={i.id}
              className={`flex flex-col gap-3 rounded-2xl border p-3.5 shadow-sm transition sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
                isSelected ? 'border-[#D6B56D] bg-white' : 'border-[#E8DCCB] bg-[#FAF7F1]'
              }`}
            >
              {/* Mobile Top Row: Checkbox, Image, Title & Delete button */}
              <div className="flex items-start gap-3 w-full sm:flex-1 min-w-0">
                <input
                  type="checkbox"
                  aria-label={`Select ${i.name}`}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-[#D8C8B5] accent-[#8B0000] focus:ring-[#8B0000] sm:mt-0"
                  checked={isSelected}
                  onChange={() => toggleItem(i.id)}
                />

                <Link
                  href={`/customer/browse/${i.product_id}`}
                  className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8DCCB] bg-[#F5EBDD] text-2xl transition hover:opacity-90 sm:h-16 sm:w-16 sm:text-3xl"
                  title="View original craft listing"
                >
                  {i.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.image_path}
                      alt={i.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    i.purchase_type === 'workshop'
                      ? <BookOpen size={24} aria-hidden="true" className="text-[#80500D]" />
                      : <Package size={24} aria-hidden="true" className="text-[#80500D]" />
                  )}
                </Link>

                <div className="flex-1 min-w-0 pr-1">
                  <Link
                    href={`/customer/browse/${i.product_id}`}
                    className="block truncate text-sm font-bold text-[#3D3028] transition hover:text-[#8B0000] sm:text-base"
                    title="Click to double check product listing"
                  >
                    {i.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#8A7D71]">
                    {i.variant ? `${i.variant} · ` : ''}
                    {i.purchase_type === 'workshop' ? (
                      <span className="badge border border-[#D6B56D] bg-[#FFF4DF] text-[10px] font-semibold text-[#80500D]">Workshop Booking</span>
                    ) : (
                      'Handcrafted Craft'
                    )}
                  </p>
                  {i.attendee_name && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#3D3028]">
                      <UserRound size={13} aria-hidden="true" className="text-[#80500D]" />
                      <span>Attendee: {i.attendee_name}</span>
                      {i.attendee_for === 'others' && (
                        <span className="rounded-full border border-[#D6B56D] bg-[#FFF4DF] px-1.5 py-0.5 text-[10px] font-semibold text-[#80500D]">
                          Guest / Group
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Link
                      href={`/customer/browse/${i.product_id}`}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#80500D] hover:text-[#8B0000] hover:underline"
                    >
                      <Eye size={13} aria-hidden="true" /> View details
                    </Link>
                    <span className="text-[#D8C8B5]">·</span>
                    <span className="font-mono text-xs text-[#71675F]">₱{i.price.toFixed(2)} each</span>
                  </div>
                </div>

                {/* Remove button on top-right for mobile */}
                <button
                  className="sm:hidden -mt-1 shrink-0 rounded-lg p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-700"
                  aria-label="Remove"
                  onClick={() => remove(i.id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Bottom Row on Mobile / Right controls on Desktop */}
              <div className="flex w-full items-center justify-between gap-4 border-t border-[#F0E8DD] pt-2 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
                <div className="flex items-center gap-1.5 overflow-hidden rounded-xl border border-[#E8DCCB] bg-white shadow-sm">
                  <button
                    className="flex h-8 w-8 items-center justify-center text-[#5A4030] transition hover:bg-[#FFF4DF] disabled:opacity-30"
                    disabled={busy}
                    onClick={() => updateQty(i.id, Math.max(1, i.quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-[#3D3028]">{i.quantity}</span>
                  <button
                    className="flex h-8 w-8 items-center justify-center text-[#5A4030] transition hover:bg-[#FFF4DF] disabled:opacity-30"
                    disabled={busy}
                    onClick={() => updateQty(i.id, i.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={13} aria-hidden="true" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-semibold uppercase text-[#8A7D71] sm:hidden">Subtotal</span>
                  <span className="font-mono text-base font-bold text-[#8B0000]">
                    ₱{(i.price * i.quantity).toFixed(2)}
                  </span>
                </div>

                <button
                  className="hidden rounded-lg p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-700 sm:inline-flex"
                  aria-label="Remove"
                  onClick={() => remove(i.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Summary Bar */}
      <div className="sticky bottom-4 flex flex-col justify-between gap-4 rounded-2xl border border-[#D6B56D] bg-white/95 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#71675F]">
            Selected Subtotal ({selectedItems.length} item{selectedItems.length === 1 ? '' : 's'})
          </p>
          <p className="font-mono text-2xl font-bold text-[#8B0000]">₱{selectedTotal.toFixed(2)}</p>
          {selectedIds.size === 0 && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-[#80500D]">
              <AlertTriangle size={13} aria-hidden="true" />
              Please check at least 1 item above to proceed.
            </p>
          )}
        </div>

        {selectedItems.length > 0 ? (
          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-6 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#6F0000] sm:w-auto"
            href={`/checkout?items=${Array.from(selectedIds).join(',')}`}
          >
            Proceed to checkout ({selectedItems.length}) <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-6 py-3 text-center text-sm font-semibold text-white opacity-50 sm:w-auto"
          >
            Select items to checkout <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
