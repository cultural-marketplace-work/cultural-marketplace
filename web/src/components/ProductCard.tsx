import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const cardImage = product.image_path ?? (product.has_tutorial ? product.tutorial_gallery?.[0] : null) ?? null;

  return (
    <Link
      href={`/customer/browse/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#E6DDC8] bg-[#FFFDF6] shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-ochre-400 hover:shadow-md"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-abaca-100/60">
        {cardImage ? (
          <Image
            src={cardImage}
            alt={product.name}
            width={640}
            height={360}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-abaca-100 to-canvas text-5xl">
            {product.has_tutorial ? '🧺' : '🧶'}
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {product.has_tutorial && (
            <span className="rounded-full bg-[#D9AD16] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
              Tutorial Available!
            </span>
          )}
        </div>
        {product.nfc_tag_id && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-charcoal-900/90 px-2 py-1 text-[9px] font-bold text-ochre-300 shadow-sm backdrop-blur-xs">
            ✔ Verified NFC
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-1 font-serif text-base font-bold text-[#45413D] transition-colors group-hover:text-crimson-700 sm:text-lg">
            {product.name}
          </h3>

          {(product.tutorial_details?.category || product.category || product.materials_used) && (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-[#C5832B]">
              {product.tutorial_details?.category || product.category || product.materials_used}
            </p>
          )}

          {product.description && (
            <div className="mt-2">
              <p className="text-[9px] font-medium text-stone-500">Description:</p>
              <p className="line-clamp-1 text-[10px] leading-snug text-stone-500">
                {product.description}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-[#A50000]">
              ₱{Number(product.price).toFixed(2)}
            </span>
            <span className="text-right text-[9px] text-stone-500">
              {product.has_variations && product.variations_data?.length
                ? `${product.variations_data.length} variants`
                : `${product.stock_quantity} pieces available`}
            </span>
          </div>

          {product.has_tutorial && (
            <div className="mt-1.5 border-t border-[#D8D1C4] pt-1.5">
              <h4 className="line-clamp-1 text-xs font-semibold text-[#45413D]">
                {product.tutorial_title || product.name}
              </h4>

              {product.tutorial_dates?.length ? (
                <div className="mt-1 space-y-0.5">
                  {product.tutorial_dates.slice(0, 2).map((session, index) => (
                    <p
                      key={`${session.date}-${index}`}
                      className="line-clamp-1 text-[8px] leading-tight text-stone-500"
                    >
                      {session.date}
                      {(session.location || product.tutorial_location) &&
                        ` | ${session.location || product.tutorial_location}`}
                    </p>
                  ))}
                </div>
              ) : product.tutorial_location ? (
                <p className="mt-1 line-clamp-1 text-[8px] leading-tight text-stone-500">
                  {product.tutorial_location}
                </p>
              ) : null}

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold text-[#C5832B]">
                  {product.tutorial_fee_type === 'free'
                    ? 'FREE / person'
                    : `₱${Number(product.tutorial_price ?? product.price).toFixed(2)} / person`}
                </span>
                {product.tutorial_capacity != null && (
                  <span className="text-right text-[9px] text-stone-500">
                    {product.tutorial_capacity} slots
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
