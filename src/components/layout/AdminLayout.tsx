"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Folder,
  Briefcase,
  Mail,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Главная", icon: LayoutDashboard },
  { href: "/admin/products", label: "Изделия", icon: Package },
  { href: "/admin/categories", label: "Категории", icon: Folder },
  { href: "/admin/projects", label: "Проекты", icon: Briefcase },
  { href: "/admin/requests", label: "Заявки", icon: Mail },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navLinks = (onNavigate?: () => void) => (
    <nav className="mt-4 flex-1 space-y-1 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Мобильная шапка */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-[#20252b] px-4 text-white lg:hidden">
        <Link href="/admin" className="font-montserrat text-lg font-bold">
          МКМ
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10"
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Мобильное выпадающее меню */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-14 flex w-[260px] max-w-[80vw] flex-col bg-[#20252b] pb-4 text-white shadow-2xl">
            {navLinks(() => setMenuOpen(false))}
            <div className="space-y-1 border-t border-white/10 px-3 pt-4">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
                На сайт
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <LogOut size={18} strokeWidth={1.75} />
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Сайдбар (десктоп) */}
      <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col bg-[#20252b] text-white lg:flex">
        <div className="px-6 py-6">
          <Link
            href="/admin"
            className="font-montserrat text-2xl font-bold text-white"
          >
            МКМ
          </Link>
          <p className="mt-1 text-xs text-white/50">Панель управления</p>
        </div>

        {navLinks()}

        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            На сайт
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Контент */}
      <div className="min-w-0 flex-1 pt-14 lg:ml-[260px] lg:pt-0">
        <main className="min-w-0 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};
