import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Car,
  ShieldCheck,
  Building2,
  GitPullRequest,
  ClipboardList,
  MessageSquare,
  ScrollText,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/compliance-queue", label: "Compliance Queue", icon: ShieldCheck },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/takeover-requests", label: "Takeover Requests", icon: GitPullRequest },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user) redirect("/");

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-gray-900 border-r border-gray-800 flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-800">
          <span className="text-sm font-semibold text-white tracking-wide">
            LyPX Admin
          </span>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {user.firstName ?? user.email}
          </p>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-gray-800">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-white hover:bg-gray-800 transition-colors w-full"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
