"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Hook pour détecter l'état pending d'un formulaire avec Server Action
 * Utilise useFormStatus de React pour tracker l'état de soumission
 */
export function useFormPending() {
  const { pending } = useFormStatus();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(pending);
  }, [pending]);

  return isPending;
}
