import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="font-display text-2xl text-brand-charcoal">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm text-muted-foreground max-w-xl">{subtitle}</p>
      ) : null}
    </div>
  );
}
