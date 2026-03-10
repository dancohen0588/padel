import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAllPlayersAction } from "@/app/actions/users";
import {
  getGlobalPaymentConfig,
  getHomeConfig,
  getHomeGallery,
  getTournaments,
} from "@/lib/queries";
import { assertAdminToken } from "@/lib/admin";
import { getAdminTokenFromCookie } from "@/app/actions/admin-auth";

export default async function AdminInscriptionsPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const adminToken = await getAdminTokenFromCookie();

  const isAuthorized = (() => {
    try {
      assertAdminToken(adminToken);
      return true;
    } catch {
      return false;
    }
  })();

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#1E1E2E] text-white">
        <Header />
        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          <div className="mb-8">
            <h2 className="gradient-text mb-2 text-2xl font-bold sm:text-4xl">
              Admin inscriptions
            </h2>
          </div>
          <AdminLoginForm />
        </main>
        <Footer />
      </div>
    );
  }

  const search = searchParams.search ?? "";
  const page = Number(searchParams.page ?? "1");

  const [tournaments, homeConfig, homeGallery, globalPaymentConfig, usersData] =
    await Promise.all([
      getTournaments(),
      getHomeConfig(),
      getHomeGallery(),
      getGlobalPaymentConfig(),
      getAllPlayersAction(adminToken, search, undefined, page, 10),
    ]);

  return (
    <div className="min-h-screen bg-[#1E1E2E] text-white">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="gradient-text mb-2 text-2xl font-bold sm:text-4xl">
            Admin inscriptions
          </h2>
          <p className="text-white/60">
            Gère les tournois, photos et contenus de la home.
          </p>
        </div>
        <div className="mt-8">
          <AdminTabs
            adminToken={adminToken}
            tournaments={tournaments}
            homeConfig={homeConfig}
            homeGallery={homeGallery}
            paymentConfig={globalPaymentConfig}
            usersData={usersData}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
