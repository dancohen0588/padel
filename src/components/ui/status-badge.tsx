import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RegistrationStatus } from "@/lib/types";

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};

const STATUS_CLASSES: Record<RegistrationStatus, string> = {
  pending: "bg-status-pending text-brand-charcoal",
  approved: "bg-status-approved text-brand-charcoal",
  rejected: "bg-status-rejected text-brand-charcoal",
};

type StatusBadgeProps = {
  status: RegistrationStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
