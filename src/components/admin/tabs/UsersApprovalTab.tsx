"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, RegistrationWithPlayer } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { GradientButton } from "@/components/ui/gradient-button";
import { updateRegistrationStatusAction } from "@/app/actions/registrations";

type UsersApprovalTabProps = {
  registrations: RegistrationWithPlayer[];
  statusCounts: Record<RegistrationStatus, number>;
  adminToken: string;
};

export function UsersApprovalTab({
  registrations,
  statusCounts,
  adminToken,
}: UsersApprovalTabProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const pending = useMemo(
    () =>
      registrations.filter((registration) => {
        if (registration.status !== "pending") return false;
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

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">
              Inscriptions à valider
            </p>
            <p className="text-xs text-muted-foreground">
              {statusCounts.pending} en attente
            </p>
          </div>
          <Input
            placeholder="Rechercher un joueur"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:max-w-sm"
          />
        </div>
      </Card>

      <div className="grid gap-4">
        {pending.length ? (
          pending.map((registration) => (
            <Card
              key={registration.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-card"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-brand-charcoal">
                    {registration.player.first_name} {registration.player.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {registration.player.email}
                  </p>
                  {registration.player.phone ? (
                    <p className="text-sm text-muted-foreground">
                      {registration.player.phone}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                    <input type="hidden" name="status" value="approved" />
                    <input type="hidden" name="adminToken" value={adminToken} />
                    <GradientButton type="submit">Valider</GradientButton>
                  </form>
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
                    <input type="hidden" name="status" value="rejected" />
                    <input type="hidden" name="adminToken" value={adminToken} />
                    <GradientButton
                      type="submit"
                      className="bg-status-rejected text-brand-charcoal"
                    >
                      Refuser
                    </GradientButton>
                  </form>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
            Aucun joueur en attente.
          </div>
        )}
      </div>
    </div>
  );
}
