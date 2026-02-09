"use client";

import { useFormState } from "react-dom";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
import { registerToTournament } from "@/app/actions/register-to-tournament";

const initialState = null;

export function SignupCta() {
  const [state, formAction] = useFormState(registerToTournament, initialState);

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-card">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-yellow/30 blur-2xl" />
      <form action={formAction} className="relative space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-charcoal/70">
          Prochaine étape
        </p>
        <h3 className="text-2xl font-semibold text-brand-charcoal md:text-3xl">
          Prêt·e à rejoindre la crew ?
        </h3>
        <p className="text-sm text-muted-foreground md:text-base">
          Les inscriptions ouvrent bientôt. Laisse ton mail pour recevoir l’ouverture des slots et les infos VIP.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            required
          />
          <GradientButton className="w-full sm:w-auto" type="submit">
            Je veux être alerté
          </GradientButton>
        </div>
        {state?.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        {state?.status === "ok" ? (
          <p className="text-sm text-emerald-600">{state.message}</p>
        ) : null}
      </form>
    </Card>
  );
}
