import Image from "next/image";
import { getHomeGallery } from "@/lib/queries";

function formatTournamentDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export async function HomeGallery() {
  const photos = await getHomeGallery();

  if (!photos.length) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-4 pt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
              {photo.caption ? (
                <p className="text-xs font-medium leading-tight text-white">{photo.caption}</p>
              ) : null}
              {photo.tournament_name ? (
                <p className="mt-0.5 text-[10px] leading-tight text-white/50">
                  {photo.tournament_name}
                  {photo.tournament_date
                    ? ` · ${formatTournamentDate(photo.tournament_date)}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
