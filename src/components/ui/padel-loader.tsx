import Image from "next/image";

type PadelLoaderProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_MAP: Record<NonNullable<PadelLoaderProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-24 w-24",
};

const PIXEL_MAP: Record<NonNullable<PadelLoaderProps["size"]>, number> = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 96,
};

export function PadelLoader({ size = "md", className = "" }: PadelLoaderProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${SIZE_MAP[size]} ${className}`}
      role="status"
      aria-label="Chargement en cours"
    >
      <Image
        src="/images/loader-raquette.png"
        alt="Chargement"
        width={PIXEL_MAP[size]}
        height={PIXEL_MAP[size]}
        className="animate-spin"
        priority
      />
      <span className="sr-only">Chargement en cours...</span>
    </div>
  );
}
