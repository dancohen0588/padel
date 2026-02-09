"use client";

import { useFormState } from "react-dom";
import { registerPlayer } from "@/app/actions/registrations";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";
import { StatusBadge } from "@/components/ui/status-badge";

const initialState = null;

type RegistrationFormProps = {
  action?: typeof registerPlayer;
};

export function RegistrationForm({ action = registerPlayer }: RegistrationFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  if (state?.status === "ok") {
    return (
      <Card className="rounded-2xl border border-border bg-white p-6 text-center shadow-card">
        <div className="space-y-4">
          <StatusBadge status="pending" />
          <div>
            <p className="text-lg font-semibold text-brand-charcoal">
              Inscription validée par l&#39;équipe !
            </p>
            <p className="text-sm text-muted-foreground">
              {state.message}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border bg-white p-6 shadow-card">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="firstName" placeholder="Prénom" required />
          <Input name="lastName" placeholder="Nom" required />
        </div>
        <Input name="email" placeholder="Email" type="email" required />
        <Input name="phone" placeholder="Téléphone" type="tel" />
        {state?.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <GradientButton fullWidth type="submit">
          Envoyer ma demande
        </GradientButton>
      </form>
    </Card>
  );
}
