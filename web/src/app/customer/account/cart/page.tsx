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
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
          <div aria-hidden="true" className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />
          <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <Link href="/customer/account/dashboard" className="hover:text-[#8B0000]">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#3D3028]">My Basket</span>
          </div>

            <div>
              <h1 className="mt-3 font-serif text-3xl font-bold text-[#3D3028] sm:text-4xl">
                Your Basket
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71675F]">
                Review your handcrafted selections and workshop passes before completing the secure exchange.
              </p>
            </div>
          </div>
        </section>

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
