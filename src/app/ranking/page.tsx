import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SectionHeader } from "@/components/ui/section-header";
import { GradientButton } from "@/components/ui/gradient-button";

export default function RankingPage() {
  return (
    <div className="min-h-screen bg-brand-gray">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <SectionHeader
          title="Classement"
          subtitle="Page placeholder — le ranking complet arrive bientôt."
        />
        <div className="mt-8 space-y-4 rounded-2xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          <p>
            On affichera ici les stats et la vue player_stats une fois branchée sur Supabase.
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
