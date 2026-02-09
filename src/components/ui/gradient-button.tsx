import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GradientButtonProps = ButtonProps & {
  fullWidth?: boolean;
};

export function GradientButton({
  className,
  fullWidth,
  ...props
}: GradientButtonProps) {
  return (
    <Button
      className={cn(
        "gradient-primary text-white shadow-glow rounded-[10px]",
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
}
