export interface NavLink {
  href: string;
  label: string;
}

export function isActiveNavLink(pathname: string, href: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}
