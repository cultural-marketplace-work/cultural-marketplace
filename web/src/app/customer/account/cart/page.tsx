import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getCart } from '@/lib/db';
import CartClient from '@/app/cart/CartClient';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountCartPage() {
  const session = await getSession();
  if (!session || session.role !== 'customer') {
    redirect('/auth/login?next=/customer/account/cart');
  }

  const cart = await getCart(session.id);

  return (
    <div className="min-h-screen bg-[#FCF9F4]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* PAGE HEADER */}
        <div className="border-b border-[#E8DCCB] pb-5">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <Link href="/customer/account/dashboard" className="hover:text-[#8B0000]">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#3D3028]">My Basket</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#3D3028]">
                Your Basket
              </h1>
              <p className="mt-1 text-sm text-[#71675F]">
                Review your handcrafted selections and workshop passes before completing the secure exchange.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <CartClient
            initialItems={cart.map((i) => {
              let itemPrice = Number(i.product?.price ?? 0);
              if (i.purchase_type === 'workshop') {
                itemPrice = Number(i.product?.tutorial_price ?? i.product?.price ?? 0);
              } else if (i.selected_variant && i.product?.variations_data) {
                const matching = i.product.variations_data.filter((x) =>
                  `${x.typeLabel}: ${x.name}` === i.selected_variant ||
                  (i.selected_variant && i.selected_variant.includes(`${x.typeLabel}: ${x.name}`))
                );
                matching.forEach((v) => {
                  if (v && v.price > 0) itemPrice += Number(v.price);
                });
              }
              return {
                id: i.id,
                product_id: i.product_id,
                quantity: i.quantity,
                name: i.product?.name ?? 'Unknown product',
                price: itemPrice,
                variant: i.selected_variant,
                purchase_type: i.purchase_type,
                session: i.selected_session,
                image_path: i.product?.image_path ?? null,
                attendee_name: i.attendee_name ?? null,
                attendee_for: i.attendee_for ?? null,
              };
            })}
          />
        </div>
      </div>
    </div>
  );
}
