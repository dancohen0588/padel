"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { registerPlayer } from "@/app/actions/registrations";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { StorageImage } from "@/components/ui/StorageImage";

type RegistrationResult = Awaited<ReturnType<typeof registerPlayer>>;

const initialState: RegistrationResult | null = null;

type RegistrationMode = "new" | "existing";

type VerifiedPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  level: string | null;
  tournamentsPlayed: number;
};

type RegistrationFormProps = {
  action?: typeof registerPlayer;
  tournamentId?: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

export function RegistrationForm({
  action = registerPlayer,
  tournamentId,
}: RegistrationFormProps) {
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);
  const [mode, setMode] = useState<RegistrationMode>("new");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [verifiedPlayer, setVerifiedPlayer] = useState<VerifiedPlayer | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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
      formData.set("email", verifiedPlayer.email);
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
    setEmail("");
    setEmailStatus("idle");
    setEmailMessage(null);
    setVerifiedPlayer(null);
    setIsVerifying(false);
  };

  const handleModeChange = (nextMode: RegistrationMode) => {
    setMode(nextMode);
    resetExistingFlow();
  };

  const handleVerifyEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailStatus("error");
      setEmailMessage("Veuillez entrer une adresse email valide");
      return;
    }

    if (!tournamentId) {
      setEmailStatus("error");
      setEmailMessage("Tournoi introuvable.");
      return;
    }

    setIsVerifying(true);
    setEmailStatus("idle");
    setEmailMessage(null);

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/verify-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        }
      );

      const payload = (await response.json()) as
        | { success: true; player: VerifiedPlayer }
        | { success: false; error: string };

      if (!response.ok || !payload.success) {
        setEmailStatus("error");
        setEmailMessage(
          payload.success
            ? "✗ Aucun compte trouvé avec cet email. Vérifiez votre adresse ou inscrivez-vous comme nouveau participant."
            : payload.error
        );
        setVerifiedPlayer(null);
        return;
      }

      setVerifiedPlayer(payload.player);
      setEmailStatus("success");
      setEmailMessage(
        `✓ Compte trouvé : ${payload.player.firstName} ${payload.player.lastName}. Confirmez pour vous inscrire à ce tournoi.`
      );
    } catch (error) {
      console.error("verify-email error", error);
      setEmailStatus("error");
      setEmailMessage("Erreur serveur.");
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
            ℹ️ Utilisez l&#39;adresse email de votre première inscription pour
            retrouver votre compte et compiler vos statistiques.
          </div>
        ) : null}
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Email <span className="text-orange-400">*</span>
          </label>
          <input
            name="email"
            placeholder="votre@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            readOnly={mode === "existing" && Boolean(verifiedPlayer)}
            aria-describedby="email-message"
            className={`w-full rounded-lg border px-4 py-3 text-base text-white transition ${
              mode === "existing"
                ? "border-orange-500/60 bg-orange-50/10"
                : "border-white/20 bg-white/5"
            } ${
              emailStatus === "error"
                ? "border-red-500/60"
                : emailStatus === "success"
                  ? "border-emerald-500/60"
                  : ""
            } ${mode === "existing" ? "text-lg" : ""} placeholder:text-white/40`}
          />
          {emailMessage ? (
            <div
              id="email-message"
              className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                emailStatus === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {emailMessage}
            </div>
          ) : null}
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
                <p className="text-sm text-white/60">{verifiedPlayer.email}</p>
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
                Téléphone
              </label>
              <input
                name="phone"
                placeholder="+33 6 12 34 56 78"
                type="tel"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Niveau <span className="text-orange-400">*</span>
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
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
                <option value="expert">Expert</option>
              </select>
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

        {mode === "existing" && !verifiedPlayer && emailStatus !== "error" ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVerifyEmail}
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

        {mode === "existing" && emailStatus === "error" && !verifiedPlayer ? (
          <div className="flex flex-col gap-2 text-sm">
            <button
              type="button"
              onClick={handleVerifyEmail}
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
