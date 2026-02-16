"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import type {
  PaymentConfig,
  RegistrationStatus,
  RegistrationWithPlayer,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { GradientButton } from "@/components/ui/gradient-button";
import { WhatsAppBadge } from "@/components/admin/WhatsAppBadge";
import { PaymentBadge } from "@/components/admin/PaymentBadge";
import { PaymentMethodSelect } from "@/components/admin/PaymentMethodSelect";
import { StorageImage } from "@/components/ui/StorageImage";
import { Toast } from "@/components/ui/toast";
import {
  createPlayerByAdminAction,
  updateRegistrationStatusAction,
} from "@/app/actions/registrations";
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
} from "@/lib/phone-utils";

type UsersValidatedTabProps = {
  registrations: RegistrationWithPlayer[];
  statusCounts: Record<RegistrationStatus, number>;
  adminToken: string;
  paymentConfig: PaymentConfig;
  tournamentId: string;
};

const LEVEL_LABELS: Record<string, string> = {
  "1": "1 - Débutant",
  "2": "2 - Débutant confirmé",
  "3": "3 - Intermédiaire",
  "4": "4 - Intermédiaire confirmé",
  "5": "5 - Confirmé",
  "6": "6 - Avancé",
  "7": "7 - Expert",
};

type VerifiedPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  photoUrl: string | null;
  level: string | null;
  isRanked: boolean;
  ranking: string | null;
  playPreference: string | null;
  tournamentsPlayed: number;
};

type CreatePlayerResult = Awaited<ReturnType<typeof createPlayerByAdminAction>>;

const initialCreateState: CreatePlayerResult | null = null;

export function UsersValidatedTab({
  registrations,
  statusCounts,
  adminToken,
  paymentConfig,
  tournamentId,
}: UsersValidatedTabProps) {
  const [search, setSearch] = useState("");
  const [whatsAppFilter, setWhatsAppFilter] = useState<
    "all" | "joined" | "not_joined"
  >("all");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "paid" | "unpaid"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayer | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const enhancedAction = async (
    prevState: CreatePlayerResult | null,
    formData: FormData
  ) => {
    formData.set("mode", mode);

    if (mode === "existing" && verifiedPlayer) {
      formData.set("playerId", verifiedPlayer.id);
      formData.set("phone", verifiedPlayer.phone);
    } else if (mode === "new") {
      const rawPhone = String(formData.get("phone") ?? "").trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (normalizedPhone) {
        formData.set("phone", normalizedPhone);
      }
    }

    return createPlayerByAdminAction(prevState, formData);
  };

  const [state, formAction] = useFormState(enhancedAction, initialCreateState);


  useEffect(() => {
    if (!showCreateModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCreateModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateModal]);

  useEffect(() => {
    if (state?.status !== "ok") return;
    setShowCreateModal(false);
    setToast(state.message);
    router.refresh();
  }, [router, state]);

  const resetExistingFlow = () => {
    setPhone("");
    setPhoneStatus("idle");
    setPhoneMessage(null);
    setVerifiedPlayer(null);
    setIsVerifying(false);
  };

  const handleModeChange = (nextMode: "new" | "existing") => {
    setMode(nextMode);
    resetExistingFlow();
  };

  const handleVerifyPhone = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneStatus("error");
      setPhoneMessage("Veuillez entrer un numéro de téléphone valide");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(trimmedPhone);
    if (!normalizedPhone) {
      setPhoneStatus("error");
      setPhoneMessage(
        "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78"
      );
      return;
    }

    setIsVerifying(true);
    setPhoneStatus("idle");
    setPhoneMessage(null);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/verify-phone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone }),
        }
      );

      const payload = (await response.json()) as
        | { success: true; player: VerifiedPlayer }
        | { success: false; error: string };

      if (!response.ok || !payload.success) {
        setPhoneStatus("error");
        setPhoneMessage(
          payload.success
            ? "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou créez un nouveau joueur."
            : payload.error
        );
        setVerifiedPlayer(null);
        return;
      }

      setVerifiedPlayer(payload.player);
      setPhoneStatus("success");
      setPhoneMessage(
        `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour l'ajouter au tournoi.`
      );
    } catch (error) {
      console.error("verify-phone error", error);
      setPhoneStatus("error");
      setPhoneMessage("Erreur serveur.");
      setVerifiedPlayer(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const levelLabel = useMemo(() => {
    if (!verifiedPlayer?.level) {
      return "—";
    }

    return LEVEL_LABELS[verifiedPlayer.level] ?? verifiedPlayer.level;
  }, [verifiedPlayer]);

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
        const hasPaid = Boolean(registration.payment_method);
        if (paymentFilter === "paid" && !hasPaid) {
          return false;
        }
        if (paymentFilter === "unpaid" && hasPaid) {
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
    [registrations, search, whatsAppFilter, paymentFilter]
  );

  const waitlist = useMemo(
    () =>
      registrations
        .filter((registration) => registration.status === "waitlist")
        .sort((a, b) => {
          const dateA = a.waitlist_added_at
            ? new Date(a.waitlist_added_at).getTime()
            : 0;
          const dateB = b.waitlist_added_at
            ? new Date(b.waitlist_added_at).getTime()
            : 0;
          return dateA - dateB;
        }),
    [registrations]
  );


  const totalCount = registrations.length;
  const approvedCount = statusCounts.approved;
  const teamsFormed = Math.floor(approvedCount / 2);
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const onWhatsAppCount = registrations.filter((reg) => reg.hasJoinedWhatsApp).length;
  const paidCount = registrations.filter((reg) => reg.payment_method).length;

  const buildInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-white">Joueurs validés</p>
          <p className="text-sm text-white/60">
            {approvedCount} joueurs confirmés pour le tournoi
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="gradient-primary rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
        >
          ➕ Créer un joueur
        </button>
      </div>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <div className="grid gap-4 md:grid-cols-5">
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
          <div className="space-y-1 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">{paidCount}</p>
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-wide text-emerald-300/80">
              Ont payé
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
            onClick={() => {
              setWhatsAppFilter("all");
              setPaymentFilter("all");
            }}
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
          <button
            type="button"
            onClick={() => setPaymentFilter("paid")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              paymentFilter === "paid"
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Payé
          </button>
          <button
            type="button"
            onClick={() => setPaymentFilter("unpaid")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              paymentFilter === "unpaid"
                ? "bg-rose-500/20 text-rose-200"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Non payé
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
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={registration.status} />
                  <PaymentBadge isPaid={Boolean(registration.payment_method)} />
                </div>
                <PaymentMethodSelect
                  registrationId={registration.id}
                  currentMethod={registration.payment_method}
                  isPaid={Boolean(registration.payment_method)}
                  paymentConfig={paymentConfig}
                  adminToken={adminToken}
                />
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
                    className="w-full bg-white/10 text-white"
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
      {waitlist.length > 0 ? (
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            <div className="flex items-center gap-2 text-amber-300">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-lg font-semibold">Liste d&#39;attente</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          </div>

          <Card className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
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
                <p className="text-sm font-semibold text-amber-300">
                  {waitlist.length} joueur{waitlist.length > 1 ? "s" : ""} en liste d&#39;attente
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Ces joueurs pourront être validés manuellement dès qu&#39;une place se libère.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {waitlist.map((registration, index) => {
              const rankingValue = registration.player.ranking?.toString().trim();
              const playPreferenceValue = registration.player.play_preference?.toString().trim();

              return (
                <Card
                  key={registration.id}
                  className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5 text-white shadow-card"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-300">
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
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-200">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                          <span>Liste d&#39;attente</span>
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
                              ? LEVEL_LABELS[registration.player.level] ??
                                registration.player.level
                              : "N/A"}
                          </span>
                          <span>•</span>
                          <span>Classement : {rankingValue || "N/A"}</span>
                          {playPreferenceValue ? (
                            <>
                              <span>•</span>
                              <span>Côté préféré : {playPreferenceValue}</span>
                            </>
                          ) : null}
                          <span>•</span>
                          <span className="font-semibold text-amber-300">
                            Position : #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <form
                      className="flex-1"
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
                      <GradientButton type="submit" className="w-full">
                        ✓ Valider maintenant
                      </GradientButton>
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
                      <input type="hidden" name="status" value="pending" />
                      <input type="hidden" name="adminToken" value={adminToken} />
                      <GradientButton
                        type="submit"
                        className="bg-white/10 text-white hover:bg-white/15"
                      >
                        ↶ Attente
                      </GradientButton>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
      <Card className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
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
              Suivi des paiements
            </p>
              <p className="mt-1 text-xs text-white/70">
                Le badge indique si le joueur a réglé son inscription. Sélectionnez le
                moyen de paiement utilisé dans la liste déroulante. Les moyens disponibles
                sont configurés dans l&#39;onglet &quot;Paiements&quot; de l&#39;admin (/admin/inscriptions).
              </p>
          </div>
        </div>
      </Card>
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
              indique que le joueur a cliqué sur &quot;Rejoindre le groupe WhatsApp&quot;
              depuis sa page de confirmation. Survolez le badge pour voir la date
              et l&#39;heure exactes du clic.
            </p>
          </div>
        </div>
      </div>
      {showCreateModal ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 text-2xl leading-none text-white/60 hover:text-white"
              >
                ✕
              </button>

              <div className="mb-8">
                <h2 className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
                  Créer un nouveau joueur
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Le joueur sera automatiquement validé et pourra participer au tournoi
                </p>
              </div>

              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5">
                <label className="block text-sm font-semibold text-white/90">
                  Avez-vous déjà participé à un tournoi ?
                </label>
                <div className="mt-4 flex items-center gap-4">
                  <span
                    className={`text-xs font-semibold transition ${
                      mode === "new" ? "text-orange-400" : "text-white/60"
                    }`}
                  >
                    Non, première fois
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleModeChange(mode === "new" ? "existing" : "new")
                    }
                    className={`relative h-8 w-16 rounded-full border-2 transition ${
                      mode === "existing"
                        ? "border-orange-500 bg-gradient-to-r from-orange-500 to-orange-400"
                        : "border-white/20 bg-white/10"
                    }`}
                    aria-label="Basculer participant existant"
                  >
                    <span
                      className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition ${
                        mode === "existing" ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold transition ${
                      mode === "existing" ? "text-orange-400" : "text-white/60"
                    }`}
                  >
                    Oui, j&#39;ai déjà joué
                  </span>
                </div>
                {mode === "existing" ? (
                  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                    ℹ️ Utilisez le numéro de téléphone de la première inscription du joueur
                    pour retrouver son compte et compiler ses statistiques.
                  </div>
                ) : null}
              </div>

              <form action={formAction} className="space-y-5">
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="adminToken" value={adminToken} />
                <input type="hidden" name="mode" value={mode} />

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Numéro de téléphone <span className="text-orange-400">*</span>
                  </label>
                  <input
                    name="phone"
                    placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    readOnly={mode === "existing" && Boolean(verifiedPlayer)}
                    aria-describedby="phone-message"
                    className={`w-full rounded-lg border px-4 py-3 text-base text-white transition ${
                      mode === "existing"
                        ? "border-orange-500/60 bg-orange-50/10"
                        : "border-white/20 bg-white/5"
                    } ${
                      phoneStatus === "error"
                        ? "border-red-500/60"
                        : phoneStatus === "success"
                          ? "border-emerald-500/60"
                          : ""
                    } ${mode === "existing" ? "text-lg" : ""} placeholder:text-white/40`}
                  />
                  {phoneMessage ? (
                    <div
                      id="phone-message"
                      className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                        phoneStatus === "error"
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {phoneMessage}
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-white/50">
                    Formats acceptés : 06.12.34.56.78, 06 12 34 56 78, 0612345678, +33 6
                    12 34 56 78
                  </p>
                </div>

                {mode === "existing" && verifiedPlayer ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white">
                        {verifiedPlayer.photoUrl ? (
                          <StorageImage
                            src={verifiedPlayer.photoUrl}
                            alt={`${verifiedPlayer.firstName} ${verifiedPlayer.lastName}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                            {verifiedPlayer.firstName[0]}
                            {verifiedPlayer.lastName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {verifiedPlayer.firstName} {verifiedPlayer.lastName}
                        </p>
                        <p className="text-sm text-white/60">
                          {formatPhoneForDisplay(verifiedPlayer.phone)}
                        </p>
                        {verifiedPlayer.email ? (
                          <p className="text-xs text-white/50">{verifiedPlayer.email}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
                      <div className="flex items-center justify-between py-1">
                        <span>Niveau</span>
                        <span className="font-semibold text-white">{levelLabel}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>Tournois précédents</span>
                        <span className="font-semibold text-white">
                          {verifiedPlayer.tournamentsPlayed} participations
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {mode === "new" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Prénom <span className="text-orange-400">*</span>
                        </label>
                        <input
                          name="firstName"
                          placeholder="John"
                          required
                          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Nom <span className="text-orange-400">*</span>
                        </label>
                        <input
                          name="lastName"
                          placeholder="Doe"
                          required
                          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Email <span className="text-xs text-white/50">(optionnel)</span>
                      </label>
                      <input
                        name="email"
                        placeholder="votre@email.com"
                        type="email"
                        className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                      />
                      <p className="mt-2 text-xs text-white/50">
                        L&#39;email est facultatif mais recommandé pour recevoir les notifications.
                      </p>
                    </div>
                    <div className="space-y-5 rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                      <h3 className="mb-4 text-sm font-semibold text-orange-400">
                        📋 Questionnaire
                      </h3>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Quel est votre niveau ? <span className="text-orange-400">*</span>
                        </label>
                        <select
                          name="level"
                          required
                          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Sélectionnez votre niveau
                          </option>
                          <option value="1">1 - Débutant</option>
                          <option value="2">2 - Débutant confirmé</option>
                          <option value="3">3 - Intermédiaire</option>
                          <option value="4">4 - Intermédiaire confirmé</option>
                          <option value="5">5 - Confirmé</option>
                          <option value="6">6 - Avancé</option>
                          <option value="7">7 - Expert</option>
                        </select>
                        <p className="mt-2 text-xs text-white/50">1 = Débutant | 7 = Expert</p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Êtes-vous classé au padel ? <span className="text-orange-400">*</span>
                        </label>
                        <div className="mb-3 flex gap-4">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="isRanked"
                              value="non"
                              checked={!isRanked}
                              onChange={() => setIsRanked(false)}
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="text-sm text-white">Non</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="isRanked"
                              value="oui"
                              checked={isRanked}
                              onChange={() => setIsRanked(true)}
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="text-sm text-white">Oui</span>
                          </label>
                        </div>
                        {isRanked ? (
                          <div className="mt-3">
                            <label className="mb-2 block text-sm font-medium text-white/80">
                              Votre classement <span className="text-orange-400">*</span>
                            </label>
                            <input
                              name="ranking"
                              type="text"
                              placeholder="Ex: P500, P1000, 15/1, 15/2..."
                              required={isRanked}
                              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Avez-vous une préférence ? <span className="text-orange-400">*</span>
                        </label>
                        <div className="flex flex-col gap-3">
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                            <input
                              type="radio"
                              name="playPreference"
                              value="droite"
                              required
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="text-sm text-white">Jouer à droite</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                            <input
                              type="radio"
                              name="playPreference"
                              value="gauche"
                              required
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="text-sm text-white">Jouer à gauche</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                            <input
                              type="radio"
                              name="playPreference"
                              value="aucune"
                              defaultChecked
                              required
                              className="h-4 w-4 accent-orange-500"
                            />
                            <span className="text-sm text-white">Pas de préférence</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {state?.status === "error" ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {state.message}
                  </div>
                ) : null}

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  ✓ Ce joueur sera immédiatement validé et ajouté à la liste des participants.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                    disabled={mode === "existing" && !verifiedPlayer}
                  >
                    Créer et valider
                  </button>
                </div>

                {mode === "existing" && !verifiedPlayer && phoneStatus !== "error" ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleVerifyPhone}
                      disabled={isVerifying}
                      className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50"
                    >
                      {isVerifying ? "Vérification..." : "Vérifier"}
                    </button>
                  </div>
                ) : null}

                {mode === "existing" && phoneStatus === "error" && !verifiedPlayer ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <button
                      type="button"
                      onClick={handleVerifyPhone}
                      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                    >
                      Réessayer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("new")}
                      className="text-xs font-semibold text-orange-400 underline"
                    >
                      Créer un nouveau joueur
                    </button>
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
