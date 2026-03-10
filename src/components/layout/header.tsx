"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "bg-brand-charcoal text-white relative",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.25),transparent_55%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-lg">
          Le Tournoi des Frérots
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link className="text-white/80 hover:text-white" href="/tournoi/en-cours">
            Tournoi
          </Link>
          <Link className="text-white/80 hover:text-white" href="/admin/inscriptions">
            Admin
          </Link>
        </nav>

        {/* Mobile burger */}
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-all duration-200",
              open && "translate-y-[7px] rotate-45"
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-all duration-200",
              open && "opacity-0"
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-6 bg-white transition-all duration-200",
              open && "-translate-y-[7px] -rotate-45"
            )}
          />
        </button>
      </div>

      {/* Mobile dropdown — absolute pour ne pas décaler la page */}
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 border-t border-white/10 bg-[#1E1E2E] shadow-lg md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 text-sm">
            <Link
              href="/tournoi/en-cours"
              className="text-white/80 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Tournoi
            </Link>
            <Link
              href="/admin/inscriptions"
              className="text-white/80 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
