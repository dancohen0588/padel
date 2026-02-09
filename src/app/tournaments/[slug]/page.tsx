import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { GradientButton } from "@/components/ui/gradient-button";

export default function TournamentDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <SectionHeader
          title={`Tournoi ${params.slug}`}
          subtitle="Page placeholder — les détails du tournoi arrivent bientôt."
        />
        <div className="mt-8 space-y-4 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          <p>
            Ici on affichera : format, horaires, liste des équipes, tarifs et call-to-action d&#39;inscription.
          </p>
          <Link href="/">
            <GradientButton className="w-full sm:w-auto">Retour à la home</GradientButton>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
