"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { RegistrationStatus, RegistrationWithPlayer } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PadelLoader } from "@/components/ui/padel-loader";
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
  function AdminButton({
    onClick,
    variant = "primary",
    children,
    isLoading = false,
    type = "button",
  }: {
    onClick?: () => void;
    variant?: "primary" | "danger" | "success";
    children: React.ReactNode;
    isLoading?: boolean;
    type?: "button" | "submit";
  }) {
    const { pending } = useFormStatus();
    const showLoader = isLoading || pending;

    const variantClasses = {
      primary:
        "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-glow hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]",
      danger:
        "border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20",
      success:
        "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    };

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={showLoader}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]}`}
      >
        {showLoader ? (
          <>
            <PadelLoader size="sm" />
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
  const [search, setSearch] = useState("");
  const router = useRouter();
  const totalPending = statusCounts.pending ?? 0;
  const totalApproved = statusCounts.approved ?? 0;
  const totalRejected = statusCounts.rejected ?? 0;

  const LEVEL_LABELS: Record<string, string> = {
    "1": "1 - Débutant",
    "2": "2 - Débutant confirmé",
    "3": "3 - Intermédiaire",
    "4": "4 - Intermédiaire confirmé",
    "5": "5 - Confirmé",
    "6": "6 - Avancé",
    "7": "7 - Expert",
  };

  const pending = useMemo(
    () =>
      registrations.filter((registration) => {
        if (registration.status !== "pending") return false;
        if (!search) return true;
        const term = search.toLowerCase();
        const fullName = `${registration.player.first_name} ${registration.player.last_name}`.toLowerCase();
        const email = registration.player.email?.toLowerCase() ?? "";
        return (
          fullName.includes(term) ||
          email.includes(term)
        );
      }),
    [registrations, search]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
          <p className="text-xs font-semibold text-white/50">En attente</p>
          <p className="mt-2 text-3xl font-bold text-orange-300">{totalPending}</p>
        </Card>
        <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
          <p className="text-xs font-semibold text-white/50">Validés</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{totalApproved}</p>
        </Card>
        <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
          <p className="text-xs font-semibold text-white/50">Refusés</p>
          <p className="mt-2 text-3xl font-bold text-rose-300">{totalRejected}</p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">
              Joueurs en attente de validation
            </p>
            <p className="text-sm text-white/50">{totalPending} inscriptions à traiter</p>
          </div>
          <Input
            placeholder="🔍 Rechercher un joueur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-white/10 bg-white/10 text-white placeholder:text-white/40 md:max-w-sm"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {pending.length ? (
          pending.map((registration) => {
            const initials = `${registration.player.first_name?.[0] ?? ""}${
              registration.player.last_name?.[0] ?? ""
            }`.toUpperCase();
            const rankingValue = registration.player.ranking?.toString().trim();
            const playPreferenceValue = registration.player.play_preference?.toString().trim();
            return (
              <Card
                key={registration.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white transition hover:border-orange-400/60 hover:bg-orange-500/5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-sm font-bold text-white">
                        {initials || "PJ"}
                      </div>
                      <div className="text-base font-semibold text-white">
                        {registration.player.first_name} {registration.player.last_name}
                      </div>
                    </div>
                  <div className="ml-14 space-y-1 text-sm text-white/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">✉️</span>
                      <span>{registration.player.email ?? "N/A"}</span>
                    </div>
                    {registration.player.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs">📱</span>
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
                    <AdminButton type="submit" variant="success">
                      ✓ Valider
                    </AdminButton>
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
                      <input type="hidden" name="status" value="waitlist" />
                      <input type="hidden" name="adminToken" value={adminToken} />
                    <AdminButton type="submit" variant="primary">
                      ⏳ Liste d&apos;attente
                    </AdminButton>
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
                    <AdminButton type="submit" variant="danger">
                      ✕ Refuser
                    </AdminButton>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-sm text-white/50">
            <div className="text-3xl opacity-40">📭</div>
            <div className="mt-3">Aucun joueur en attente de validation</div>
          </div>
        )}
      </div>
    </div>
  );
}
