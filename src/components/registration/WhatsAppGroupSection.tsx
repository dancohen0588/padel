"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type WhatsAppGroupSectionProps = {
  whatsappGroupLink: string;
  playerId: string;
  tournamentId: string;
  hasAlreadyJoined: boolean;
};

export function WhatsAppGroupSection({
  whatsappGroupLink,
  playerId,
  tournamentId,
  hasAlreadyJoined,
}: WhatsAppGroupSectionProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(hasAlreadyJoined);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!qrCodeRef.current) return;
    QRCode.toCanvas(
      qrCodeRef.current,
      whatsappGroupLink,
      {
        width: 180,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      },
      (error: Error | null) => {
        if (error) console.error("QR Code generation error:", error);
      }
    );
  }, [whatsappGroupLink]);

  const handleJoinWhatsApp = async () => {
    setIsJoining(true);

    try {
      const response = await fetch("/api/players/track-whatsapp-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          tournamentId,
        }),
      });

      if (response.ok) {
        setHasJoined(true);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
    } finally {
      window.open(whatsappGroupLink, "_blank");
      setIsJoining(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 backdrop-blur-sm">
      <div className="mb-5 text-center">
        <div className="mb-2 text-4xl">💬</div>
        <h3 className="text-xl font-bold text-white">
          Rejoignez le groupe WhatsApp !
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Restez connecté avec les autres participants, recevez les dernières
          infos et organisez vos matchs
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
        <div className="flex flex-col items-center">
          <div
            className="mb-3 inline-block cursor-pointer rounded-xl bg-white p-4"
            onClick={handleJoinWhatsApp}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleJoinWhatsApp();
              }
            }}
          >
            <canvas ref={qrCodeRef} />
          </div>
          <p className="text-xs text-white/50">Scannez avec votre téléphone</p>
        </div>

        <div className="flex items-center gap-3 md:flex-col">
          <div className="h-px w-12 bg-white/20 md:h-12 md:w-px"></div>
          <span className="text-xs font-semibold text-white/40">OU</span>
          <div className="h-px w-12 bg-white/20 md:h-12 md:w-px"></div>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleJoinWhatsApp}
            disabled={isJoining}
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(37,211,102,0.3)] disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <svg
                  className="h-6 w-6 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Ouverture...</span>
              </>
            ) : hasJoined ? (
              <>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Groupe rejoint !</span>
              </>
            ) : (
              <>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span>Rejoindre le groupe</span>
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-white/50">Cliquez pour ouvrir WhatsApp</p>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <span className="text-base">✅</span>
        <p className="text-xs text-emerald-200/90">
          <strong>Astuce :</strong> En rejoignant le groupe, vous pourrez
          échanger avec les organisateurs et les autres participants, partager
          vos disponibilités et recevoir les rappels importants.
        </p>
      </div>
    </div>
  );
}
