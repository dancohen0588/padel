import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { assertAdminToken } from "@/lib/admin";
import { getAllPlayersAction } from "@/app/actions/users";
import { UsersManagement } from "@/components/admin/UsersManagement";

type SearchParams = {
  token?: string;
  search?: string;
  status?: string;
  page?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const adminToken = searchParams.token ?? "";

  try {
    assertAdminToken(adminToken);
  } catch {
    return (
      <div className="min-h-screen bg-[#1E1E2E] text-white">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-2xl font-semibold">Admin utilisateurs</h1>
            <p className="mt-2 text-sm text-white/60">
              Token admin invalide. Ajoute ?token=ADMIN_TOKEN à l’URL.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/60">
              Exemple : /admin/users?token=VOTRE_TOKEN
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const search = searchParams.search ?? "";
  const status = (searchParams.status ?? "all") as
    | "all"
    | "verified"
    | "pending"
    | "suspended";
  const page = Number(searchParams.page ?? "1");

  const data = await getAllPlayersAction(adminToken, search, status, page, 10);

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <UsersManagement initialData={data} adminToken={adminToken} />
      </main>
      <Footer />
    </div>
  );
}
