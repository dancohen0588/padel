/**
 * Normalise un numéro de téléphone français vers le format E.164 (+33XXXXXXXXX)
 *
 * Formats acceptés :
 * - 0XXXXXXXXX
 * - 0X.XX.XX.XX.XX
 * - 0X XX XX XX XX
 * - +33XXXXXXXXX
 * - +33X.XX.XX.XX.XX
 * - +33X XX XX XX XX
 */
export function normalizePhoneNumber(phone: string): string | null {
  let cleaned = phone.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+33")) {
    const digits = cleaned.substring(3);
    if (digits.length === 9) {
      return `+33${digits}`;
    }
    return null;
  }

  if (cleaned.startsWith("33") && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `+33${cleaned.substring(1)}`;
  }

  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    return `+33${cleaned}`;
  }

  return null;
}

/**
 * Valide si un numéro de téléphone est au bon format
 */
export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Formate un numéro de téléphone pour l'affichage (format français lisible)
 * Exemple: +33612345678 → 06 12 34 56 78
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone;

  const digits = `0${normalized.substring(3)}`;
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}
