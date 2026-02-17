"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import {
  deletePlayerAction,
  updatePlayerAction,
  uploadPlayerPhotoAction,
} from "@/app/actions/users";
import { StorageImage } from "@/components/ui/StorageImage";

type EditUserModalProps = {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  adminToken: string;
};

export function EditUserModal({
  player,
  isOpen,
  onClose,
  adminToken,
}: EditUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Player["status"]>("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName(player.first_name ?? "");
    setLastName(player.last_name ?? "");
    setEmail(player.email ?? "");
    setPhone(player.phone ?? "");
    setStatus(player.status ?? "pending");
    setAdminNotes(player.admin_notes ?? "");
    setPhotoUrl(player.photo_url ?? null);
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
  }, [player, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }

    const nextData: {
      first_name?: string;
      last_name?: string;
      email?: string | null;
      phone?: string | null;
      status?: Player["status"];
      admin_notes?: string | null;
    } = {};

    if (firstName.trim() !== (player.first_name ?? "")) {
      nextData.first_name = firstName.trim();
    }
    if (lastName.trim() !== (player.last_name ?? "")) {
      nextData.last_name = lastName.trim();
    }
    if ((email || "") !== (player.email ?? "")) {
      nextData.email = email.trim() ? email.trim() : null;
    }
    if ((phone || "") !== (player.phone ?? "")) {
      nextData.phone = phone.trim() ? phone.trim() : null;
    }
    if (status !== (player.status ?? "pending")) {
      nextData.status = status ?? "pending";
    }
    if ((adminNotes || "") !== (player.admin_notes ?? "")) {
      nextData.admin_notes = adminNotes.trim() ? adminNotes.trim() : null;
    }

    if (Object.keys(nextData).length === 0) {
      setError("Aucune modification détectée.");
      return;
    }

    startTransition(async () => {
      const result = await updatePlayerAction(player.id, nextData, adminToken);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la mise à jour.");
        return;
      }
      setSuccess("Utilisateur mis à jour.");
      router.refresh();
    });
  };

  const handleUploadPhoto = () => {
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError("Sélectionne une photo à uploader.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      const result = await uploadPlayerPhotoAction(player.id, formData, adminToken);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de l’upload.");
        return;
      }
      setPhotoUrl(result.photoUrl ?? null);
      setSelectedFile(null);
      setSuccess("Photo mise à jour.");
      router.refresh();
    });
  };

  const handleDelete = () => {
    setError(null);
    setSuccess(null);

    const confirmed = window.confirm(
      "Supprimer cet utilisateur ? Cette action est irréversible."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePlayerAction(player.id, adminToken);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la suppression.");
        return;
      }
      router.refresh();
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-2xl leading-none text-white/60 transition hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div className="mb-8">
            <h2 className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
              Modifier un utilisateur
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Modifie les informations principales, le statut et les notes admin.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-orange-400 to-amber-500">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <StorageImage
                    src={photoUrl}
                    alt={`${player.first_name} ${player.last_name}`}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-white">
                  {player.first_name} {player.last_name}
                </p>
                <p className="text-sm text-white/60">ID: {player.id}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                  >
                    Choisir une photo
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={isPending}
                    className="rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mettre à jour la photo
                  </button>
                </div>
                {selectedFile ? (
                  <p className="mt-2 text-xs text-white/50">{selectedFile.name}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Prénom <span className="text-orange-400">*</span>
              </label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="input-field text-base"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Nom <span className="text-orange-400">*</span>
              </label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="input-field text-base"
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field text-base"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Téléphone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="input-field text-base"
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Statut</label>
              <select
                value={status ?? "pending"}
                onChange={(event) =>
                  setStatus(event.target.value as Player["status"])
                }
                className="input-field text-base"
              >
                <option value="pending">⏳ En attente</option>
                <option value="verified">✓ Vérifié</option>
                <option value="suspended">🚫 Suspendu</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-white/80">
                Notes admin
              </label>
              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                rows={4}
                className="input-field text-base"
                placeholder="Notes internes, remarques, historique..."
              />
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Supprimer
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:from-orange-400 hover:to-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
