"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { registerPlayer } from "@/app/actions/registrations";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { StorageImage } from "@/components/ui/StorageImage";
import { PaymentInfoBlock } from "@/components/payments/PaymentInfoBlock";
import type { PaymentConfig } from "@/lib/types";
import {
  formatPhoneForDisplay,
  normalizePhoneNumber,
} from "@/lib/phone-utils";

type RegistrationResult = Awaited<ReturnType<typeof registerPlayer>>;

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

  const enhancedAction = async (
    prevState: RegistrationResult | null,
    formData: FormData
  ) => {
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

    return action(prevState, formData);
  };

  const [state, formAction] = useFormState(enhancedAction, initialState);

  const levelLabel = useMemo(() => {
    if (!verifiedPlayer?.level) {
      return "—";
    }

    return LEVEL_LABELS[verifiedPlayer.level] ?? verifiedPlayer.level;
  }, [verifiedPlayer]);

  const resetExistingFlow = () => {
    setPhone("");
    setPhoneStatus("idle");
    setPhoneMessage(null);
    setVerifiedPlayer(null);
    setIsVerifying(false);
  };

  const handleModeChange = (nextMode: RegistrationMode) => {
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

  if (state?.status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-emerald-300">
            ✅ Inscription reçue
          </div>
          <p className="text-lg font-semibold text-white">
            Inscription validée par l&#39;équipe !
          </p>
          <p className="text-sm text-white/70">{state.message}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
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

      <form action={formAction} className="space-y-5">
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
            Formats acceptés : 06.12.34.56.78, 06 12 34 56 78, 0612345678, +33 6 12
            34 56 78
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
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-5">
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
            <div className="space-y-2">
              <label className="mb-2 block text-sm font-medium text-white/80">
                Photo de profil
              </label>
              <ImageDropzone
                onImageSelected={setPlayerPhoto}
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

        <PaymentInfoBlock price={price} paymentConfig={paymentConfig} />

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
      </form>
    </div>
  );
}
