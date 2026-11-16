'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActiveNavLink, type NavLink } from './nav-utils';

export default function DesktopNavigation({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="hidden items-center gap-4 text-sm xl:flex"
    >
      {links.map((link) => {
        const active = isActiveNavLink(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={true}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap transition-colors ${
              active
                ? 'font-semibold text-yellow-700'
                : 'font-medium text-charcoal-800 hover:text-crimson-600'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
