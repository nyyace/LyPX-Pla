"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={`lypx-tab${active ? " active" : ""}`}>
      {label}
    </Link>
  );
}
