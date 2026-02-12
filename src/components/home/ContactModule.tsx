import Link from "next/link";

export function ContactModule() {
  return (
    <section className="rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] p-5 text-center">
      <div className="text-lg font-bold">On se rejoint ?</div>
      <p className="mt-2 text-sm text-white/90">
        Inscris-toi au prochain tournoi et viens défier les meilleurs.
      </p>
      <Link
        href="/inscription"
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#ff6b35] transition hover:-translate-y-0.5"
      >
        S&apos;inscrire
      </Link>
    </section>
  );
}
