
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[#DCC5A8] bg-[#F5EBDD] text-[#211B17]">
     

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5">
        <div className="grid grid-cols-1 items-start gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1.15fr]">

          {/* Brand & Provenance */}
          <div className="min-w-0 space-y-4">

            {/* Logo and Brand Name */}
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="Cultural Marketplace — home"
              >
                <img
                  src="/images/cultural-marketplace-logo.png"
                  alt="Cultural Marketplace Logo"
                  className="h-12 w-auto max-w-[95px] object-contain sm:h-14 sm:max-w-[110px]"
                />
              </Link>

              {/* Brand Name Beside Logo */}
              <div className="flex min-w-0 flex-col justify-center leading-tight">
                <h2 className="whitespace-nowrap font-sans text-sm font-extrabold tracking-tight sm:text-base lg:text-lg">
                  <span className="text-[#8B0000]">Cultural</span>{' '}
                  <span className="text-[#D18A00]">Marketplace</span>
                </h2>

                <p className="mt-1 max-w-[190px] text-[9px] font-semibold leading-relaxed text-[#8B0000] sm:text-[10px]">
                  Agusan del Sur Indigenous Crafts and Experiences
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#51443A]">
              Preserving the Indigenous traditions of Agusan del Sur 
              by connecting local artisans and cultural communities with 
              buyers around the world. Supporting traditional crafts, sharing 
              cultural knowledge, and keeping heritage alive for future generations.
            </p>
          </div>

          {/* Column 1: Discover */}
          <div className="min-w-0 space-y-3">
            <p className="font-sculpted text-sm font-semibold uppercase tracking-wider text-[#8B0000]">
              Discover the Craft
            </p>

            <ul className="space-y-2 text-xs text-[#51443A]">
              <li>
                <Link href="/customer/browse" className="transition hover:text-[#990000]">
                  Explore Traditional Weaves
                </Link>
              </li>
              <li>
                <Link href="/artisans" className="transition hover:text-[#990000]">
                  Master Artisans &amp; Lineage
                </Link>
              </li>
              <li>
                <Link href="/customer/browse" className="transition hover:text-[#990000]">
                  Living Cultural Workshops
                </Link>
              </li>
              <li>
                <Link href="/verify/35:F3:D4:33:79" className="transition hover:text-[#990000]">
                  NFC Authenticity Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: The Gathering */}
          <div className="min-w-0 space-y-3">
            <p className="font-sculpted text-sm font-semibold uppercase tracking-wider text-[#8B0000]">
              The Gathering
            </p>

            <ul className="space-y-2 text-xs text-[#51443A]">
              <li>
                <Link href="/auth/register-artisan" className="transition hover:text-[#990000]">
                  Register as an Artisan
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="transition hover:text-[#990000]">
                  Costumer Login
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="transition hover:text-[#990000]">
                  Join the Community
                </Link>
              </li>
              <li>
                <Link href="/cart" className="transition hover:text-[#990000]">
                  Your Artisan Basket
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Cultural Respect & Ethics */}
          <div className="min-w-0 space-y-3">
            <p className="font-sculpted text-sm font-semibold uppercase tracking-wider text-[#8B0000]">
              Cultural Respect
            </p>

            <p className="text-xs leading-relaxed text-[#51443A]">
              Each craft design reflects the traditions and cultural heritage 
              of Indigenous communities. We respect the meaning of every pattern 
              and help preserve these traditions by recognizing their cultural origins.
            </p>

            <p className="text-[11px] leading-relaxed text-[#8B5E00]">
              Caraga Region · Agusan del Sur, Philippines
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
          <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-[#DCC5A8] pt-3 text-center text-xs text-[#78695C] sm:mt-5 lg:flex-row">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} Cultural Marketplace. All rights
            reserved.
          </p>

          <p className="text-[11px] leading-relaxed">
            Honoring Manobo, Higaonon, Banwaon, and Talaandig Artisan Heritage
          </p>
        </div>
      </div>
    </footer>
  );
}
