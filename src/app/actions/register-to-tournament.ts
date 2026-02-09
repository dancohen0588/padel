"use server";

type RegisterResult = {
  status: "ok" | "error";
  message: string;
};

export async function registerToTournament(
  _prevState: RegisterResult | null,
  formData: FormData
): Promise<RegisterResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { status: "error", message: "Ajoute un email pour être alerté." };
  }

  return {
    status: "ok",
    message: "Merci ! On te prévient dès l'ouverture des inscriptions.",
  };
}
