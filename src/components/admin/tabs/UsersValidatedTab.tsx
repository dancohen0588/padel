"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, RegistrationWithPlayer } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { GradientButton } from "@/components/ui/gradient-button";
import { WhatsAppBadge } from "@/components/admin/WhatsAppBadge";
import { updateRegistrationStatusAction } from "@/app/actions/registrations";

type UsersValidatedTabProps = {
  registrations: RegistrationWithPlayer[];
  statusCounts: Record<RegistrationStatus, number>;
  adminToken: string;
};

export function UsersValidatedTab({
  registrations,
  statusCounts,
  adminToken,
}: UsersValidatedTabProps) {
  const [search, setSearch] = useState("");
  const [whatsAppFilter, setWhatsAppFilter] = useState<
    "all" | "joined" | "not_joined"
  >("all");
  const router = useRouter();


  const LEVEL_LABELS: Record<string, string> = {
    "1": "1 - Débutant",
    "2": "2 - Débutant confirmé",
    "3": "3 - Intermédiaire",
    "4": "4 - Intermédiaire confirmé",
    "5": "5 - Confirmé",
    "6": "6 - Avancé",
    "7": "7 - Expert",
  };

  const approved = useMemo(
    () =>
      registrations.filter((registration) => {
        if (registration.status !== "approved") return false;
        if (whatsAppFilter === "joined" && !registration.hasJoinedWhatsApp) {
          return false;
        }
        if (whatsAppFilter === "not_joined" && registration.hasJoinedWhatsApp) {
          return false;
        }
        if (!search) return true;
        const term = search.toLowerCase();
        const fullName = `${registration.player.first_name} ${registration.player.last_name}`.toLowerCase();
        const email = registration.player.email?.toLowerCase() ?? "";
        return (
          fullName.includes(term) ||
          email.includes(term)
        );
      }),
    [registrations, search, whatsAppFilter]
  );


  const totalCount = registrations.length;
  const approvedCount = statusCounts.approved;
  const teamsFormed = Math.floor(approvedCount / 2);
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const onWhatsAppCount = registrations.filter((reg) => reg.hasJoinedWhatsApp).length;

  const buildInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-2xl font-semibold text-white">Joueurs validés</p>
        <p className="text-sm text-white/60">
          {approvedCount} joueurs confirmés pour le tournoi
        </p>
      </div>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-semibold">{approvedCount}</p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Joueurs validés
            </p>
          </div>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-semibold">{teamsFormed}</p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Équipes formées
            </p>
          </div>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-2xl font-semibold">{approvalRate}%</p>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Taux de validation
            </p>
          </div>
          <div className="space-y-1 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent p-4">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">{onWhatsAppCount}</p>
              <svg
                className="h-5 w-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ animation: "subtlePulse 2s ease-in-out infinite" }}
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-wide text-green-300/80">
              Sur WhatsApp
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold">Liste des participants</p>
            <p className="text-sm text-white/60">
              {approvedCount} joueurs validés pour le tournoi
            </p>
          </div>
          <Input
            placeholder="🔍 Rechercher un joueur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:max-w-sm"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWhatsAppFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              whatsAppFilter === "all"
                ? "bg-white/15 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setWhatsAppFilter("joined")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              whatsAppFilter === "joined"
                ? "bg-green-500/20 text-green-200"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Sur WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setWhatsAppFilter("not_joined")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              whatsAppFilter === "not_joined"
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Pas sur WhatsApp
          </button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {approved.length ? (
          approved.map((registration) => {
            const rankingValue = registration.player.ranking?.toString().trim();
            const playPreferenceValue = registration.player.play_preference?.toString().trim();

            return (
              <Card
                key={registration.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card"
              >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {buildInitials(
                    registration.player.first_name,
                    registration.player.last_name
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold">
                      {registration.player.first_name} {registration.player.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>Validé</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span>✉️</span>
                        <span>{registration.player.email ?? "N/A"}</span>
                      </div>
                      <WhatsAppBadge
                        hasJoined={Boolean(registration.hasJoinedWhatsApp)}
                        joinedAt={registration.whatsappJoinDate}
                      />
                    </div>
                    {registration.player.phone ? (
                      <div className="flex items-center gap-2">
                        <span>📱</span>
                        <span>{registration.player.phone}</span>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                      <span>
                        Niveau :{" "}
                        {registration.player.level
                          ? LEVEL_LABELS[registration.player.level] ?? registration.player.level
                          : "N/A"}
                      </span>
                      <span>•</span>
                      <span>
                        Classement :{" "}
                        {rankingValue || "N/A"}
                      </span>
                      <span>•</span>
                      <span>
                        Côté préféré :{" "}
                        {playPreferenceValue || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusBadge status={registration.status} />
                <form
                  action={async (formData) => {
                    await updateRegistrationStatusAction(formData);
                    router.refresh();
                  }}
                >
                  <input
                    type="hidden"
                    name="registrationId"
                    value={registration.id}
                  />
                  <input type="hidden" name="status" value="pending" />
                  <input type="hidden" name="adminToken" value={adminToken} />
                  <GradientButton
                    type="submit"
                    className="bg-white/10 text-white"
                  >
                    ↶ Repasser en attente
                  </GradientButton>
                </form>
              </div>
            </Card>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/60">
            Aucun joueur validé.
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-300">
              À propos du badge WhatsApp
            </p>
            <p className="mt-1 text-xs text-white/70">
              Le badge{" "}
              <span className="mx-1 inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-300">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </span>{" "}
              indique que le joueur a cliqué sur "Rejoindre le groupe WhatsApp"
              depuis sa page de confirmation. Survolez le badge pour voir la date
              et l'heure exactes du clic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
