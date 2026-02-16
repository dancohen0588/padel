-- Migration: configuration globale des paiements

create table if not exists public.payment_config (
  id uuid primary key default uuid_generate_v4(),
  config jsonb not null default '{
    "enabled": false,
    "methods": {
      "bank": { "enabled": false, "iban": null, "bic": null },
      "lydia": { "enabled": false, "identifier": null },
      "revolut": { "enabled": false, "link": null, "tag": null },
      "wero": { "enabled": false, "identifier": null },
      "cash": { "enabled": false }
    },
    "confirmationEmail": null,
    "paymentDeadlineHours": 48
  }'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.payment_config (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

comment on table public.payment_config is 'Configuration globale des moyens de paiement.';
comment on column public.payment_config.config is 'JSON de configuration des paiements.';
