import Image, { type ImageProps } from "next/image";

type StorageImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  fallback?: string;
};

/**
 * Composant Image qui gère automatiquement les URLs de storage locales
 */
export function StorageImage({ src, fallback, alt, ...props }: StorageImageProps) {
  const imageSrc = src || fallback || "/placeholder-image.png";

  return <Image src={imageSrc} alt={alt} {...props} />;
}
