"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Player } from "@/lib/types";
import { EditUserModal } from "./EditUserModal";

type UsersManagementProps = {
  initialData: {
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
  };
  adminToken: string;
};

const PAGE_SIZE = 10;

export function UsersManagement({ initialData, adminToken }: UsersManagementProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const currentSearch = searchParams.get("search") ?? "";

  const openEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setSelectedPlayer(null);
    setIsEditOpen(false);
  };

  const updateParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    Object.entries(next).forEach(([key, value]) => {
      if (value && value.length) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set("token", adminToken);
    startTransition(() => router.push(`/admin/inscriptions?${params.toString()}`));
  };

  const handleSearch = (value: string) => {
    updateParams({ search: value, page: "1" });
  };

  const handlePage = (value: number) => {
    updateParams({ page: String(value) });
  };

  const resultsLabel = useMemo(() => {
    const start = (initialData.page - 1) * PAGE_SIZE + 1;
    const end = Math.min(initialData.page * PAGE_SIZE, initialData.total);
    return { start, end };
  }, [initialData.page, initialData.total]);

  const getInitials = (player: Player) =>
    `${player.first_name?.[0] ?? ""}${player.last_name?.[0] ?? ""}`.toUpperCase();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  };

  const formatRelative = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Aujourd’hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
    }
    const months = Math.floor(diffDays / 30);
    return `Il y a ${months} mois`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-3xl font-semibold text-transparent">
          Gestion des utilisateurs
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Gestion complète des joueurs inscrits.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                defaultValue={currentSearch}
                placeholder="Rechercher un utilisateur..."
                className="input-field w-72 pl-10 text-sm"
                onChange={(event) => handleSearch(event.target.value)}
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

          </div>

          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-center">
            <div className="text-2xl font-semibold text-emerald-300">
              {initialData.total}
            </div>
            <div className="text-xs uppercase tracking-wide text-white/50">Total</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Inscription
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {initialData.players.map((player) => (
                <tr
                  key={player.id}
                  className="border-l-2 border-transparent transition hover:border-orange-400/40 hover:bg-orange-500/5"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
                        {player.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.photo_url}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                            {getInitials(player)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-xs text-white/40">
                          ID: {player.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm text-white/80">
                      <div className="flex items-center gap-2">
                        <span>✉️</span>
                        <span>{player.email ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📱</span>
                        <span>{player.phone ?? "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white/70">
                      {formatDate(player.created_at)}
                    </div>
                    <div className="text-xs text-white/40">
                      {formatRelative(player.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(player)}
                      className="rounded-lg bg-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/30"
                    >
                      ✏️ Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-white/5 px-6 py-4 text-sm text-white/60">
          <div>
            Affichage de{" "}
            <span className="font-semibold text-white">{resultsLabel.start}</span>
            -
            <span className="font-semibold text-white">{resultsLabel.end}</span> sur{" "}
            <span className="font-semibold text-white">{initialData.total}</span> utilisateurs
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePage(Math.max(1, initialData.page - 1))}
              disabled={initialData.page === 1 || isPending}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Précédent
            </button>
            {Array.from({ length: initialData.totalPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePage(page)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    page === initialData.page
                      ? "bg-orange-500 text-white"
                      : "bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => handlePage(Math.min(initialData.totalPages, initialData.page + 1))}
              disabled={initialData.page === initialData.totalPages || isPending}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <EditUserModal
          player={selectedPlayer}
          isOpen={isEditOpen}
          onClose={closeEditModal}
          adminToken={adminToken}
        />
      )}
    </div>
  );
}
