import { Card } from "@/components/ui/card";

type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  tournaments: number;
  trend: "up" | "down" | "steady";
};

type LeaderboardCardProps = {
  entries: ReadonlyArray<LeaderboardEntry>;
};

const trendLabel = (trend: LeaderboardEntry["trend"]) => {
  if (trend === "up") return "⬆️";
  if (trend === "down") return "⬇️";
  return "➡️";
};

export function LeaderboardCard({ entries }: LeaderboardCardProps) {
  return (
    <Card className="rounded-3xl border border-border bg-white p-6 shadow-card">
      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-brand-gray/60 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/40 text-sm font-semibold text-brand-charcoal">
                {entry.rank}
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-charcoal">
                  {entry.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.tournaments} tournois
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-charcoal">
                {entry.points} pts
              </p>
              <p className="text-xs text-muted-foreground">
                {trendLabel(entry.trend)} tendance
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
