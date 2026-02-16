"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { PadelLoader } from "@/components/ui/padel-loader";
import { useFormPending } from "@/hooks/use-form-pending";
import { cn } from "@/lib/utils";

type GradientButtonProps = ButtonProps & {
  fullWidth?: boolean;
  isLoading?: boolean;
};

export function GradientButton({
  children,
  className,
  fullWidth,
  disabled,
  isLoading = false,
  ...props
}: GradientButtonProps) {
  const isPending = useFormPending();
  const showLoader = isLoading || isPending;

  return (
    <Button
      disabled={disabled || showLoader}
      className={cn(
        "gradient-primary text-white hover:text-white shadow-glow rounded-[10px]",
        showLoader && "cursor-not-allowed",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
          {showLoader ? (
            <>
              <PadelLoader size="sm" />
              <span>Chargement...</span>
            </>
          ) : (
        children
      )}
    </Button>
  );
}
