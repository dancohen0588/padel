import Image from "next/image";
import { getHomeGallery } from "@/lib/queries";

export async function HomeGallery() {
  const photos = await getHomeGallery();

  if (!photos.length) {
    return null;
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-lg">🖼️</span>
        <h2 className="text-lg font-semibold">Galerie</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10"
          >
            <Image
              src={photo.photo_url}
              alt={photo.caption ?? "Photo"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {photo.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs font-medium text-white">{photo.caption}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
