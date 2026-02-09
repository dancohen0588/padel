"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, RegistrationWithPlayer } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { GradientButton } from "@/components/ui/gradient-button";
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
  const router = useRouter();

  const approved = useMemo(
    () =>
      registrations.filter((registration) => {
        if (registration.status !== "approved") return false;
        if (!search) return true;
        const term = search.toLowerCase();
        const fullName = `${registration.player.first_name} ${registration.player.last_name}`.toLowerCase();
        return (
          fullName.includes(term) ||
          registration.player.email.toLowerCase().includes(term)
        );
      }),
    [registrations, search]
  );

  const totalCount = registrations.length;
  const approvedCount = statusCounts.approved;
  const teamsFormed = Math.floor(approvedCount / 2);
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

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
        <div className="grid gap-4 md:grid-cols-3">
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
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {approved.length ? (
          approved.map((registration) => (
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
                    <div className="flex items-center gap-2">
                      <span>✉️</span>
                      <span>{registration.player.email}</span>
                    </div>
                    {registration.player.phone ? (
                      <div className="flex items-center gap-2">
                        <span>📱</span>
                        <span>{registration.player.phone}</span>
                      </div>
                    ) : null}
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
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/60">
            Aucun joueur validé.
          </div>
        )}
      </div>
    </div>
  );
}
