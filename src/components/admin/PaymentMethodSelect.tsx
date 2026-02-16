"use client";

import type { ChangeEvent } from "react";
import type { PaymentConfig, PaymentMethodKey } from "@/lib/types";
import { getEnabledPaymentMethods } from "@/lib/types";
import { updatePaymentMethodAction, updatePaymentStatusAction } from "@/app/actions/payments";

type PaymentMethodSelectProps = {
  registrationId: string;
  currentMethod: PaymentMethodKey | null | undefined;
  isPaid: boolean;
  paymentConfig: PaymentConfig;
  adminToken: string;
};

export function PaymentMethodSelect({
  registrationId,
  currentMethod,
  isPaid,
  paymentConfig,
  adminToken,
}: PaymentMethodSelectProps) {
  const enabledMethods = getEnabledPaymentMethods(paymentConfig);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const method = event.target.value as PaymentMethodKey | "";
    if (!method) {
      const resetData = new FormData();
      resetData.append("registrationId", registrationId);
      resetData.append("paymentStatus", "false");
      resetData.append("paymentMethod", "");
      resetData.append("adminToken", adminToken);

      await updatePaymentStatusAction(resetData);
      return;
    }

    const formData = new FormData();
    formData.append("registrationId", registrationId);
    formData.append("paymentMethod", method);
    formData.append("adminToken", adminToken);

    await updatePaymentMethodAction(formData);

    if (!isPaid) {
      const paidData = new FormData();
      paidData.append("registrationId", registrationId);
      paidData.append("paymentStatus", "true");
      paidData.append("paymentMethod", method);
      paidData.append("adminToken", adminToken);
      await updatePaymentStatusAction(paidData);
    }
  };

  return (
    <select
      value={currentMethod ?? ""}
      onChange={handleChange}
      className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 ${
        "border-white/20 bg-white/10 text-white focus:border-orange-400/50 focus:ring-orange-400/20"
      }`}
    >
      <option value="" className="bg-[#1E1E2E] text-white/50">
        Moyen de paiement
      </option>
      {enabledMethods.map((method) => (
        <option
          key={method.key}
          value={method.key}
          className="bg-[#1E1E2E] text-white"
        >
          {method.icon} {method.label}
        </option>
      ))}
    </select>
  );
}
