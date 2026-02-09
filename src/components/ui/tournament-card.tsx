import Link from "next/link";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";

type TournamentCardProps = {
  slug: string;
  name: string;
  dateLabel: string;
  location: string;
  priceLabel: string;
  slotsLabel: string;
  imagePath?: string | null;
  highlight?: string;
};

export function TournamentCard({
  slug,
  name,
  dateLabel,
  location,
  priceLabel,
  slotsLabel,
  imagePath,
  highlight,
}: TournamentCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between rounded-3xl border border-border bg-white p-6 shadow-card">
      <div className="space-y-4">
        {imagePath ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            <img
              src={imagePath}
              alt={name}
              className="h-36 w-full object-cover"
            />
          </div>
        ) : null}
        {highlight ? (
          <span className="inline-flex w-fit items-center rounded-full bg-brand-yellow/40 px-3 py-1 text-xs font-semibold text-brand-charcoal">
            {highlight}
          </span>
        ) : null}
        <div>
          <h3 className="text-xl font-semibold text-brand-charcoal">{name}</h3>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>📍 {location}</p>
          <p>💸 {priceLabel}</p>
          <p>🎟️ {slotsLabel}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        <Link href={`/tournaments/${slug}`} className="block">
          <GradientButton fullWidth>Voir le tournoi</GradientButton>
        </Link>
        <Link href={`/tournaments/${slug}/register`} className="block">
          <GradientButton fullWidth>S&apos;inscrire</GradientButton>
        </Link>
      </div>
    </Card>
  );
}
