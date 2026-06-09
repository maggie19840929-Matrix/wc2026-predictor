"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsername, clearUsername } from "@/lib/username";

export function Navbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  function logout() {
    clearUsername();
    window.location.reload();
  }

  const links = [
    { href: "/", label: "赛程" },
    { href: "/parlay", label: "串关策略" },
    { href: "/leaderboard", label: "排行榜" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-gray-800">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-lg text-white">
          <span className="text-2xl">⚽</span>
          <span>WC26 竞猜</span>
        </Link>

        <div className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href ? "text-emerald-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}

          {username && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300 font-semibold">{username}</span>
              <button onClick={logout} className="text-xs text-gray-600 hover:text-red-400">
                换人
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
