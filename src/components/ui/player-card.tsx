import { Card } from "@/components/ui/card";
import type { Player, RegistrationStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";

type PlayerCardProps = {
  player: Player;
  status?: RegistrationStatus;
};

export function PlayerCard({ player, status }: PlayerCardProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-brand-charcoal">
            {player.first_name} {player.last_name}
          </p>
          <p className="text-sm text-muted-foreground">{player.email}</p>
          {player.phone ? (
            <p className="text-sm text-muted-foreground">{player.phone}</p>
          ) : null}
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </Card>
  );
}
