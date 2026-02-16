"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { registerPairAction, registerPlayer } from "@/app/actions/registrations";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { StorageImage } from "@/components/ui/StorageImage";
import { PaymentInfoBlock } from "@/components/payments/PaymentInfoBlock";
import { WhatsAppGroupSection } from "@/components/registration/WhatsAppGroupSection";
import type { PaymentConfig } from "@/lib/types";
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
} from "@/lib/phone-utils";

type RegistrationResult = Awaited<ReturnType<typeof registerPlayer>>;
type PairRegistrationResult = Awaited<ReturnType<typeof registerPairAction>>;

const initialState: RegistrationResult | null = null;

type RegistrationMode = "new" | "existing";

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

type RegistrationFormProps = {
  action?: typeof registerPlayer;
  tournamentId?: string | null;
  price?: number | null;
  paymentConfig?: PaymentConfig | null;
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

export function RegistrationForm({
  action = registerPlayer,
  tournamentId,
  price = null,
  paymentConfig = null,
}: RegistrationFormProps) {
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [mode, setMode] = useState<RegistrationMode>("new");
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayer | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [isPairMode, setIsPairMode] = useState(false);

  const [player1Photo, setPlayer1Photo] = useState<File | null>(null);
  const [player2Photo, setPlayer2Photo] = useState<File | null>(null);
  const [player1Mode, setPlayer1Mode] = useState<RegistrationMode>("new");
  const [player2Mode, setPlayer2Mode] = useState<RegistrationMode>("new");
  const [player1Phone, setPlayer1Phone] = useState("");
  const [player2Phone, setPlayer2Phone] = useState("");
  const [player1PhoneStatus, setPlayer1PhoneStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [player2PhoneStatus, setPlayer2PhoneStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [player1PhoneMessage, setPlayer1PhoneMessage] = useState<string | null>(
    null
  );
  const [player2PhoneMessage, setPlayer2PhoneMessage] = useState<string | null>(
    null
  );
  const [player1VerifiedPlayer, setPlayer1VerifiedPlayer] =
    useState<VerifiedPlayer | null>(null);
  const [player2VerifiedPlayer, setPlayer2VerifiedPlayer] =
    useState<VerifiedPlayer | null>(null);
  const [player1IsVerifying, setPlayer1IsVerifying] = useState(false);
  const [player2IsVerifying, setPlayer2IsVerifying] = useState(false);
  const [player1IsRanked, setPlayer1IsRanked] = useState(false);
  const [player2IsRanked, setPlayer2IsRanked] = useState(false);

  const enhancedAction = async (
    prevState: RegistrationResult | PairRegistrationResult | null,
    formData: FormData
  ) => {
    if (isPairMode) {
      if (player1Photo) {
        formData.set("player1_photo", player1Photo);
      }
      if (player2Photo) {
        formData.set("player2_photo", player2Photo);
      }

      formData.set("player1Mode", player1Mode);
      formData.set("player2Mode", player2Mode);

      if (player1Mode === "existing" && player1VerifiedPlayer) {
        formData.set("player1PlayerId", player1VerifiedPlayer.id);
        formData.set("player1Phone", player1VerifiedPlayer.phone);
      } else if (player1Mode === "new") {
        const rawPhone = String(formData.get("player1Phone") ?? "").trim();
        const normalizedPhone = normalizePhoneNumber(rawPhone);
        if (normalizedPhone) {
          formData.set("player1Phone", normalizedPhone);
        }
      }

      if (player2Mode === "existing" && player2VerifiedPlayer) {
        formData.set("player2PlayerId", player2VerifiedPlayer.id);
        formData.set("player2Phone", player2VerifiedPlayer.phone);
      } else if (player2Mode === "new") {
        const rawPhone = String(formData.get("player2Phone") ?? "").trim();
        const normalizedPhone = normalizePhoneNumber(rawPhone);
        if (normalizedPhone) {
          formData.set("player2Phone", normalizedPhone);
        }
      }

      return registerPairAction(prevState as PairRegistrationResult | null, formData);
    }

    if (playerPhoto) {
      formData.set("player_photo", playerPhoto);
    }

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

    return action(prevState as RegistrationResult | null, formData);
  };

  const [state, formAction] = useFormState(
    enhancedAction,
    initialState as RegistrationResult | PairRegistrationResult | null
  );

  const levelLabel = useMemo(() => {
    if (!(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.level) {
      return "—";
    }

    const levelKey = (isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.level ?? "";
    return LEVEL_LABELS[levelKey] ?? levelKey;
  }, [isPairMode, player1VerifiedPlayer, verifiedPlayer]);

  const resetExistingFlow = () => {
    setPhone("");
    setPhoneStatus("idle");
    setPhoneMessage(null);
    setVerifiedPlayer(null);
    setIsVerifying(false);
  };

  const resetPlayer1ExistingFlow = () => {
    setPlayer1Phone("");
    setPlayer1PhoneStatus("idle");
    setPlayer1PhoneMessage(null);
    setPlayer1VerifiedPlayer(null);
    setPlayer1IsVerifying(false);
  };

  const resetPlayer2ExistingFlow = () => {
    setPlayer2Phone("");
    setPlayer2PhoneStatus("idle");
    setPlayer2PhoneMessage(null);
    setPlayer2VerifiedPlayer(null);
    setPlayer2IsVerifying(false);
  };

  const handleModeChange = (nextMode: RegistrationMode) => {
    setMode(nextMode);
    resetExistingFlow();
  };

  const handlePlayer1ModeChange = (nextMode: RegistrationMode) => {
    setPlayer1Mode(nextMode);
    resetPlayer1ExistingFlow();
  };

  const handlePlayer2ModeChange = (nextMode: RegistrationMode) => {
    setPlayer2Mode(nextMode);
    resetPlayer2ExistingFlow();
  };

  const togglePairMode = () => {
    setIsPairMode((prev) => !prev);
    setPlayer1Mode("new");
    setPlayer2Mode("new");
    resetPlayer1ExistingFlow();
    resetPlayer2ExistingFlow();
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

    if (!tournamentId) {
      setPhoneStatus("error");
      setPhoneMessage("Tournoi introuvable.");
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
            ? "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou inscrivez-vous comme nouveau participant."
            : payload.error
        );
        setVerifiedPlayer(null);
        return;
      }

      setVerifiedPlayer(payload.player);
      setPhoneStatus("success");
      setPhoneMessage(
        `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour vous inscrire à ce tournoi.`
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

  const handleVerifyPlayerPhone = async (
    player: "player1" | "player2"
  ) => {
    const isPlayer1 = player === "player1";
    const currentPhone = isPlayer1 ? player1Phone : player2Phone;

    if (!currentPhone.trim()) {
      if (isPlayer1) {
        setPlayer1PhoneStatus("error");
        setPlayer1PhoneMessage("Veuillez entrer un numéro de téléphone valide");
      } else {
        setPlayer2PhoneStatus("error");
        setPlayer2PhoneMessage("Veuillez entrer un numéro de téléphone valide");
      }
      return;
    }

    const normalizedPhone = normalizePhoneNumber(currentPhone.trim());
    if (!normalizedPhone) {
      if (isPlayer1) {
        setPlayer1PhoneStatus("error");
        setPlayer1PhoneMessage(
          "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78"
        );
      } else {
        setPlayer2PhoneStatus("error");
        setPlayer2PhoneMessage(
          "Format de téléphone invalide. Utilisez : 06 12 34 56 78 ou +33 6 12 34 56 78"
        );
      }
      return;
    }

    if (!tournamentId) {
      if (isPlayer1) {
        setPlayer1PhoneStatus("error");
        setPlayer1PhoneMessage("Tournoi introuvable.");
      } else {
        setPlayer2PhoneStatus("error");
        setPlayer2PhoneMessage("Tournoi introuvable.");
      }
      return;
    }

    if (isPlayer1) {
      setPlayer1IsVerifying(true);
      setPlayer1PhoneStatus("idle");
      setPlayer1PhoneMessage(null);
    } else {
      setPlayer2IsVerifying(true);
      setPlayer2PhoneStatus("idle");
      setPlayer2PhoneMessage(null);
    }

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
        if (isPlayer1) {
          setPlayer1PhoneStatus("error");
          setPlayer1PhoneMessage(
            payload.success
              ? "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou inscrivez-vous comme nouveau participant."
              : payload.error
          );
          setPlayer1VerifiedPlayer(null);
        } else {
          setPlayer2PhoneStatus("error");
          setPlayer2PhoneMessage(
            payload.success
              ? "✗ Aucun compte trouvé avec ce numéro. Vérifiez votre numéro ou inscrivez-vous comme nouveau participant."
              : payload.error
          );
          setPlayer2VerifiedPlayer(null);
        }
        return;
      }

      if (isPlayer1) {
        setPlayer1VerifiedPlayer(payload.player);
        setPlayer1PhoneStatus("success");
        setPlayer1PhoneMessage(
          `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour vous inscrire à ce tournoi.`
        );
      } else {
        setPlayer2VerifiedPlayer(payload.player);
        setPlayer2PhoneStatus("success");
        setPlayer2PhoneMessage(
          `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour vous inscrire à ce tournoi.`
        );
      }
    } catch (error) {
      console.error("verify-phone error", error);
      if (isPlayer1) {
        setPlayer1PhoneStatus("error");
        setPlayer1PhoneMessage("Erreur serveur.");
        setPlayer1VerifiedPlayer(null);
      } else {
        setPlayer2PhoneStatus("error");
        setPlayer2PhoneMessage("Erreur serveur.");
        setPlayer2VerifiedPlayer(null);
      }
    } finally {
      if (isPlayer1) {
        setPlayer1IsVerifying(false);
      } else {
        setPlayer2IsVerifying(false);
      }
    }
  };

  if (state?.status === "ok") {
    return (
      <div className="space-y-6">
        <div className="success-animation rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-emerald-300">
              ✅ Inscription reçue
            </div>
            <p className="text-lg font-semibold text-white">
              Inscription validée par l&#39;équipe !
            </p>
            <p className="text-sm text-white/70">{state.message}</p>
          </div>
        </div>

        {state.whatsappGroupLink ? (
          <WhatsAppGroupSection
            whatsappGroupLink={state.whatsappGroupLink}
            playerId={"playerId" in state ? state.playerId : state.player1Id}
            tournamentId={state.tournamentId}
            hasAlreadyJoined={state.hasAlreadyJoined}
          />
        ) : null}

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${
        isPairMode ? "max-w-[1400px]" : "max-w-[600px]"
      } mx-auto`}
    >
      {!isPairMode ? (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={togglePairMode}
            className="group flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-orange-400/40 hover:bg-orange-500/10"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter mon binôme</span>
          </button>
        </div>
      ) : (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={togglePairMode}
            className="group flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Retirer le binôme</span>
          </button>
        </div>
      )}
      {isPairMode ? (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">✓</span>
            <p className="flex-1 text-sm text-emerald-300">
              Les deux joueurs seront inscrits ensemble au tournoi et pourront former une équipe
            </p>
          </div>
        </div>
      ) : null}

      {!isPairMode ? (
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5">
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
            onClick={() => handleModeChange(mode === "new" ? "existing" : "new")}
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
            ℹ️ Utilisez le numéro de téléphone de votre première inscription pour
            retrouver votre compte et compiler vos statistiques.
          </div>
        ) : null}
        </div>
      ) : null}

      <form action={formAction} className="space-y-5">
        <div
          className={
            isPairMode ? "lg:grid lg:grid-cols-2 lg:gap-6" : "space-y-6"
          }
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {isPairMode ? (
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-300">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  Joueur 1
                </div>
              </div>
            ) : null}

            <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5">
              <label className="block text-sm font-semibold text-white/90">
                Avez-vous déjà participé à un tournoi ?
              </label>
              <div className="mt-4 flex items-center gap-4">
                <span
                  className={`text-xs font-semibold transition ${
                    (isPairMode ? player1Mode : mode) === "new"
                      ? "text-orange-400"
                      : "text-white/60"
                  }`}
                >
                  Non, première fois
                </span>
                <button
                  type="button"
                  onClick={() =>
                    isPairMode
                      ? handlePlayer1ModeChange(player1Mode === "new" ? "existing" : "new")
                      : handleModeChange(mode === "new" ? "existing" : "new")
                  }
                  className={`relative h-8 w-16 rounded-full border-2 transition ${
                    (isPairMode ? player1Mode : mode) === "existing"
                      ? "border-orange-500 bg-gradient-to-r from-orange-500 to-orange-400"
                      : "border-white/20 bg-white/10"
                  }`}
                  aria-label="Basculer participant existant"
                >
                  <span
                    className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition ${
                      (isPairMode ? player1Mode : mode) === "existing" ? "right-1" : "left-1"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-semibold transition ${
                    (isPairMode ? player1Mode : mode) === "existing"
                      ? "text-orange-400"
                      : "text-white/60"
                  }`}
                >
                  Oui, j&#39;ai déjà joué
                </span>
              </div>
              {(isPairMode ? player1Mode : mode) === "existing" ? (
                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                  ℹ️ Utilisez le numéro de téléphone de votre première inscription pour retrouver votre compte et compiler vos statistiques.
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Numéro de téléphone <span className="text-orange-400">*</span>
              </label>
              <input
                name={isPairMode ? "player1Phone" : "phone"}
                placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
                type="tel"
                value={isPairMode ? player1Phone : phone}
                onChange={(event) =>
                  isPairMode ? setPlayer1Phone(event.target.value) : setPhone(event.target.value)
                }
                required
                readOnly={
                  (isPairMode ? player1Mode : mode) === "existing" &&
                  Boolean(isPairMode ? player1VerifiedPlayer : verifiedPlayer)
                }
                aria-describedby={isPairMode ? "player1-phone-message" : "phone-message"}
                className={`w-full rounded-lg border px-4 py-3 text-base text-white transition ${
                  (isPairMode ? player1Mode : mode) === "existing"
                    ? "border-orange-500/60 bg-orange-50/10"
                    : "border-white/20 bg-white/5"
                } ${
                  (isPairMode ? player1PhoneStatus : phoneStatus) === "error"
                    ? "border-red-500/60"
                    : (isPairMode ? player1PhoneStatus : phoneStatus) === "success"
                      ? "border-emerald-500/60"
                      : ""
                } ${(isPairMode ? player1Mode : mode) === "existing" ? "text-lg" : ""} placeholder:text-white/40`}
              />
              {(isPairMode ? player1PhoneMessage : phoneMessage) ? (
                <div
                  id={isPairMode ? "player1-phone-message" : "phone-message"}
                  className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                    (isPairMode ? player1PhoneStatus : phoneStatus) === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {isPairMode ? player1PhoneMessage : phoneMessage}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-white/50">
                Formats acceptés : 06.12.34.56.78, 06 12 34 56 78, 0612345678, +33 6 12 34 56 78
              </p>
            </div>

            {(isPairMode ? player1Mode : mode) === "existing" &&
            (isPairMode ? player1VerifiedPlayer : verifiedPlayer) ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white">
                    {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.photoUrl ? (
                      <StorageImage
                        src={(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.photoUrl ?? ""}
                        alt={`${(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.firstName ?? ""} ${(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.lastName ?? ""}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                        {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.firstName?.[0] ?? ""}
                        {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.lastName?.[0] ?? ""}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.firstName} {" "}
                      {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.lastName}
                    </p>
                    <p className="text-sm text-white/60">
                      {formatPhoneForDisplay(
                        (isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.phone ?? ""
                      )}
                    </p>
                    {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.email ? (
                      <p className="text-xs text-white/50">
                        {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
                  <div className="flex items-center justify-between py-1">
                    <span>Niveau</span>
                    <span className="font-semibold text-white">
                      {levelLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Tournois précédents</span>
                    <span className="font-semibold text-white">
                      {(isPairMode ? player1VerifiedPlayer : verifiedPlayer)?.tournamentsPlayed} participations
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {(isPairMode ? player1Mode : mode) === "new" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Prénom <span className="text-orange-400">*</span>
                    </label>
                    <input
                      name={isPairMode ? "player1FirstName" : "firstName"}
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
                      name={isPairMode ? "player1LastName" : "lastName"}
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
                    name={isPairMode ? "player1Email" : "email"}
                    placeholder="votre@email.com"
                    type="email"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                  />
                  <p className="mt-2 text-xs text-white/50">
                    L&#39;email est facultatif mais recommandé pour recevoir les notifications.
                  </p>
                </div>
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-5">
                  <h3 className="mb-4 text-sm font-semibold text-orange-400">
                    📋 Questionnaire
                  </h3>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Quel est votre niveau ? <span className="text-orange-400">*</span>
                    </label>
                    <select
                      name={isPairMode ? "player1Level" : "level"}
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
                          name={isPairMode ? "player1IsRanked" : "isRanked"}
                          value="non"
                          checked={isPairMode ? !player1IsRanked : !isRanked}
                          onChange={() =>
                            isPairMode ? setPlayer1IsRanked(false) : setIsRanked(false)
                          }
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-sm text-white">Non</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={isPairMode ? "player1IsRanked" : "isRanked"}
                          value="oui"
                          checked={isPairMode ? player1IsRanked : isRanked}
                          onChange={() =>
                            isPairMode ? setPlayer1IsRanked(true) : setIsRanked(true)
                          }
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-sm text-white">Oui</span>
                      </label>
                    </div>
                    {(isPairMode ? player1IsRanked : isRanked) ? (
                      <div className="mt-3">
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Votre classement <span className="text-orange-400">*</span>
                        </label>
                        <input
                          name={isPairMode ? "player1Ranking" : "ranking"}
                          type="text"
                          placeholder="Ex: P500, P1000, 15/1, 15/2..."
                          required={isPairMode ? player1IsRanked : isRanked}
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
                          name={isPairMode ? "player1PlayPreference" : "playPreference"}
                          value="droite"
                          required
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-sm text-white">Jouer à droite</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                        <input
                          type="radio"
                          name={isPairMode ? "player1PlayPreference" : "playPreference"}
                          value="gauche"
                          required
                          className="h-4 w-4 accent-orange-500"
                        />
                        <span className="text-sm text-white">Jouer à gauche</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                        <input
                          type="radio"
                          name={isPairMode ? "player1PlayPreference" : "playPreference"}
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
                <div className="space-y-2">
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Photo de profil
                  </label>
                  <ImageDropzone
                    onImageSelected={isPairMode ? setPlayer1Photo : setPlayerPhoto}
                    label={""}
                    description="Glissez votre photo ici"
                    aspectRatio="1/1"
                    maxSize={5 * 1024 * 1024}
                    className="mx-auto max-w-[200px]"
                  />
                </div>
                {!isPairMode ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Binôme <span className="text-xs text-white/50">(optionnel)</span>
                    </label>
                    <input
                      name="pairWith"
                      type="text"
                      placeholder="Prénom et nom de votre binôme (ex: Jean Dupont)"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                    />
                    <p className="mt-2 text-xs text-white/50">
                      Si vous souhaitez jouer avec un binôme en particulier, indiquez son nom ici.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {!isPairMode ? (
              <>
                {state?.status === "error" ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {state.message}
                  </div>
                ) : null}

                <PaymentInfoBlock
                  price={price}
                  paymentConfig={paymentConfig}
                  isPairMode={false}
                />

                {mode === "new" ? (
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                    >
                      S&#39;inscrire au tournoi
                    </button>
                  </div>
                ) : null}

                {mode === "existing" && !verifiedPlayer && phoneStatus !== "error" ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleVerifyPhone}
                      disabled={isVerifying}
                      className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50"
                    >
                      {isVerifying ? "Vérification..." : "Vérifier mon compte"}
                    </button>
                  </div>
                ) : null}

                {mode === "existing" && verifiedPlayer ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                    >
                      Confirmer l&#39;inscription
                    </button>
                    <button
                      type="button"
                      onClick={resetExistingFlow}
                      className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                    >
                      Ce n&#39;est pas moi
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
                      M&#39;inscrire comme nouveau participant
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {isPairMode ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  Joueur 2
                </div>
              </div>

              <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5">
                <label className="block text-sm font-semibold text-white/90">
                  Avez-vous déjà participé à un tournoi ?
                </label>
                <div className="mt-4 flex items-center gap-4">
                  <span
                    className={`text-xs font-semibold transition ${
                      player2Mode === "new" ? "text-emerald-300" : "text-white/60"
                    }`}
                  >
                    Non, première fois
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePlayer2ModeChange(player2Mode === "new" ? "existing" : "new")}
                    className={`relative h-8 w-16 rounded-full border-2 transition ${
                      player2Mode === "existing"
                        ? "border-emerald-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "border-white/20 bg-white/10"
                    }`}
                    aria-label="Basculer participant existant"
                  >
                    <span
                      className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition ${
                        player2Mode === "existing" ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold transition ${
                      player2Mode === "existing" ? "text-emerald-300" : "text-white/60"
                    }`}
                  >
                    Oui, j&#39;ai déjà joué
                  </span>
                </div>
                {player2Mode === "existing" ? (
                  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                    ℹ️ Utilisez le numéro de téléphone de votre première inscription pour retrouver votre compte et compiler vos statistiques.
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Numéro de téléphone <span className="text-orange-400">*</span>
                </label>
                <input
                  name="player2Phone"
                  placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
                  type="tel"
                  value={player2Phone}
                  onChange={(event) => setPlayer2Phone(event.target.value)}
                  required
                  readOnly={player2Mode === "existing" && Boolean(player2VerifiedPlayer)}
                  aria-describedby="player2-phone-message"
                  className={`w-full rounded-lg border px-4 py-3 text-base text-white transition ${
                    player2Mode === "existing"
                      ? "border-emerald-500/60 bg-emerald-50/10"
                      : "border-white/20 bg-white/5"
                  } ${
                    player2PhoneStatus === "error"
                      ? "border-red-500/60"
                      : player2PhoneStatus === "success"
                        ? "border-emerald-500/60"
                        : ""
                  } ${player2Mode === "existing" ? "text-lg" : ""} placeholder:text-white/40`}
                />
                {player2PhoneMessage ? (
                  <div
                    id="player2-phone-message"
                    className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                      player2PhoneStatus === "error"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {player2PhoneMessage}
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-white/50">
                  Formats acceptés : 06.12.34.56.78, 06 12 34 56 78, 0612345678, +33 6 12 34 56 78
                </p>
              </div>

              {player2Mode === "existing" && player2VerifiedPlayer ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 text-white">
                      {player2VerifiedPlayer.photoUrl ? (
                        <StorageImage
                          src={player2VerifiedPlayer.photoUrl}
                          alt={`${player2VerifiedPlayer.firstName} ${player2VerifiedPlayer.lastName}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                          {player2VerifiedPlayer.firstName[0]}
                          {player2VerifiedPlayer.lastName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {player2VerifiedPlayer.firstName} {player2VerifiedPlayer.lastName}
                      </p>
                      <p className="text-sm text-white/60">
                        {formatPhoneForDisplay(player2VerifiedPlayer.phone)}
                      </p>
                      {player2VerifiedPlayer.email ? (
                        <p className="text-xs text-white/50">{player2VerifiedPlayer.email}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {player2Mode === "new" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Prénom <span className="text-orange-400">*</span>
                      </label>
                      <input
                        name="player2FirstName"
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
                        name="player2LastName"
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
                      name="player2Email"
                      placeholder="votre@email.com"
                      type="email"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
                    />
                    <p className="mt-2 text-xs text-white/50">
                      L&#39;email est facultatif mais recommandé pour recevoir les notifications.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-5">
                    <h3 className="mb-4 text-sm font-semibold text-emerald-300">
                      📋 Questionnaire
                    </h3>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        Quel est votre niveau ? <span className="text-orange-400">*</span>
                      </label>
                      <select
                        name="player2Level"
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
                            name="player2IsRanked"
                            value="non"
                            checked={!player2IsRanked}
                            onChange={() => setPlayer2IsRanked(false)}
                            className="h-4 w-4 accent-orange-500"
                          />
                          <span className="text-sm text-white">Non</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="player2IsRanked"
                            value="oui"
                            checked={player2IsRanked}
                            onChange={() => setPlayer2IsRanked(true)}
                            className="h-4 w-4 accent-orange-500"
                          />
                          <span className="text-sm text-white">Oui</span>
                        </label>
                      </div>
                      {player2IsRanked ? (
                        <div className="mt-3">
                          <label className="mb-2 block text-sm font-medium text-white/80">
                            Votre classement <span className="text-orange-400">*</span>
                          </label>
                          <input
                            name="player2Ranking"
                            type="text"
                            placeholder="Ex: P500, P1000, 15/1, 15/2..."
                            required={player2IsRanked}
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
                            name="player2PlayPreference"
                            value="droite"
                            required
                            className="h-4 w-4 accent-orange-500"
                          />
                          <span className="text-sm text-white">Jouer à droite</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                          <input
                            type="radio"
                            name="player2PlayPreference"
                            value="gauche"
                            required
                            className="h-4 w-4 accent-orange-500"
                          />
                          <span className="text-sm text-white">Jouer à gauche</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                          <input
                            type="radio"
                            name="player2PlayPreference"
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
                  <div className="space-y-2">
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Photo de profil
                    </label>
                    <ImageDropzone
                      onImageSelected={setPlayer2Photo}
                      label={""}
                      description="Glissez votre photo ici"
                      aspectRatio="1/1"
                      maxSize={5 * 1024 * 1024}
                      className="mx-auto max-w-[200px]"
                    />
                  </div>
                </>
              ) : null}

              {state?.status === "error" ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {state.message}
                </div>
              ) : null}

              {player2Mode === "existing" && !player2VerifiedPlayer && player2PhoneStatus !== "error" ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleVerifyPlayerPhone("player2")}
                    disabled={player2IsVerifying}
                    className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {player2IsVerifying ? "Vérification..." : "Vérifier mon compte"}
                  </button>
                </div>
              ) : null}

              {player2Mode === "existing" && player2VerifiedPlayer ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(16,185,129,0.3)]"
                  >
                    Confirmer l&#39;inscription
                  </button>
                  <button
                    type="button"
                    onClick={resetPlayer2ExistingFlow}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                  >
                    Ce n&#39;est pas moi
                  </button>
                </div>
              ) : null}

              {player2Mode === "existing" && player2PhoneStatus === "error" && !player2VerifiedPlayer ? (
                <div className="flex flex-col gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleVerifyPlayerPhone("player2")}
                    className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(16,185,129,0.3)]"
                  >
                    Réessayer
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayer2ModeChange("new")}
                    className="text-xs font-semibold text-emerald-300 underline"
                  >
                    M&#39;inscrire comme nouveau participant
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {isPairMode ? (
          <>
            <PaymentInfoBlock price={price} paymentConfig={paymentConfig} isPairMode={isPairMode} />
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
              >
                Inscrire les deux joueurs
              </button>
            </div>
            {player1Mode === "existing" && !player1VerifiedPlayer && player1PhoneStatus !== "error" ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleVerifyPlayerPhone("player1")}
                  disabled={player1IsVerifying}
                  className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)] disabled:opacity-50"
                >
                  {player1IsVerifying ? "Vérification..." : "Vérifier le compte du joueur 1"}
                </button>
              </div>
            ) : null}

            {player1Mode === "existing" && player1VerifiedPlayer ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                >
                  Confirmer l&#39;inscription
                </button>
                <button
                  type="button"
                  onClick={resetPlayer1ExistingFlow}
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15"
                >
                  Ce n&#39;est pas moi
                </button>
              </div>
            ) : null}

            {player1Mode === "existing" && player1PhoneStatus === "error" && !player1VerifiedPlayer ? (
              <div className="flex flex-col gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => handleVerifyPlayerPhone("player1")}
                  className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,107,53,0.3)]"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayer1ModeChange("new")}
                  className="text-xs font-semibold text-orange-400 underline"
                >
                  M&#39;inscrire comme nouveau participant
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </form>
    </div>
  );
}
