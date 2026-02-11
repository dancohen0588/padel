import Link from "next/link";
import { cn } from "@/lib/utils";

type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "bg-brand-charcoal text-white relative overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.25),transparent_55%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-lg">
          Le Tournoi des Frérots
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link
            className="text-white/80 hover:text-white"
            href="/tournoi/en-cours"
          >
            Tournoi
          </Link>
          <Link className="text-white/80 hover:text-white" href="/admin/inscriptions">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
