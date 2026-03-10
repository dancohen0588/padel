"use client";

import { useState, useTransition } from "react";
import { toggleWhatsAppStatusAction } from "@/app/actions/registrations";

type WhatsAppBadgeProps = {
  hasJoined: boolean;
  joinedAt?: string | null;
  playerId?: string;
  tournamentId?: string;
  adminToken?: string;
};

export function WhatsAppBadge({
  hasJoined: initialHasJoined,
  joinedAt: initialJoinedAt,
  playerId,
  tournamentId,
  adminToken,
}: WhatsAppBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasJoined, setHasJoined] = useState(initialHasJoined);
  const [joinedAt, setJoinedAt] = useState(initialJoinedAt);
  const [isPending, startTransition] = useTransition();

  const isInteractive = Boolean(playerId && tournamentId && adminToken);

  const handleToggle = () => {
    if (!isInteractive || isPending) return;
    const nextHasJoined = !hasJoined;
    setHasJoined(nextHasJoined);
    if (nextHasJoined) {
      setJoinedAt(new Date().toISOString());
    } else {
      setJoinedAt(null);
    }
    startTransition(async () => {
      const result = await toggleWhatsAppStatusAction(
        playerId!,
        tournamentId!,
        adminToken!
      );
      if (result.status === "error") {
        setHasJoined(!nextHasJoined);
        setJoinedAt(initialJoinedAt ?? null);
      }
    });
  };

  const formattedDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (!hasJoined) {
    return (
      <span
        onClick={isInteractive ? handleToggle : undefined}
        className={`inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/50 ${isInteractive ? "cursor-pointer transition hover:border-green-400/40 hover:bg-green-500/10 hover:text-green-300" : ""} ${isPending ? "opacity-50" : ""}`}
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        Pas sur WhatsApp
      </span>
    );
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        onClick={isInteractive ? handleToggle : undefined}
        className={`inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/15 px-2.5 py-1 text-[11px] font-semibold text-green-300 ${isInteractive ? "cursor-pointer transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300" : "cursor-pointer"} ${isPending ? "opacity-50" : ""}`}
        style={isPending ? undefined : { animation: "subtlePulse 2s ease-in-out infinite" }}
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        WhatsApp
      </span>

      {showTooltip && (formattedDate || isInteractive) ? (
        <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg">
          {formattedDate ? `Rejoint le ${formattedDate}` : null}
          {isInteractive ? (
            <div className={formattedDate ? "mt-1 text-white/50" : ""}>
              Cliquer pour désactiver
            </div>
          ) : null}
          <div className="absolute left-1/2 top-full -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
