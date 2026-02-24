"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentConfig, Player, Tournament } from "@/lib/types";
import type { GalleryPhotoWithTournament } from "@/lib/queries";
import { TournamentsTab } from "@/components/admin/tabs/TournamentsTab";
import { GalerieTab } from "@/components/admin/tabs/GalerieTab";
import { PaymentsTab } from "@/components/admin/tabs/PaymentsTab";
import { UsersManagement } from "@/components/admin/UsersManagement";

type AdminTabsProps = {
  adminToken: string;
  tournaments: Tournament[];
  paymentConfig: PaymentConfig;
  usersData: {
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
  };
  homeConfig?: {
    id: string;
    cover_photo_url: string | null;
  } | null;
  homeGallery?: GalleryPhotoWithTournament[];
};

export function AdminTabs({
  adminToken,
  tournaments,
  paymentConfig,
  usersData,
  homeConfig,
  homeGallery = [],
}: AdminTabsProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  return (
    <Tabs defaultValue="tournaments" className="w-full">
      <TabsList className="flex w-full flex-wrap gap-3 border-b border-white/10 bg-transparent p-0 shadow-none">
        <TabsTrigger value="tournaments" className="rounded-none px-0 pb-4">
          Tournois
        </TabsTrigger>
        <TabsTrigger value="payments" className="rounded-none px-0 pb-4">
          Paiements
        </TabsTrigger>
        <TabsTrigger value="users" className="rounded-none px-0 pb-4">
          Utilisateurs
        </TabsTrigger>
        <TabsTrigger value="galerie" className="rounded-none px-0 pb-4">
          Galerie photo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tournaments" className="mt-6">
        <TournamentsTab
          tournaments={tournaments}
          adminToken={adminToken}
          selectedId={selectedTournamentId}
          onSelectTournament={setSelectedTournamentId}
        />
      </TabsContent>
      <TabsContent value="payments" className="mt-6">
        <PaymentsTab
          adminToken={adminToken}
          paymentConfig={paymentConfig}
        />
      </TabsContent>
      <TabsContent value="users" className="mt-6">
        <UsersManagement initialData={usersData} adminToken={adminToken} />
      </TabsContent>
      <TabsContent value="galerie" className="mt-6">
        <GalerieTab
          adminToken={adminToken}
          photos={homeGallery}
          tournaments={tournaments}
          config={homeConfig ?? null}
        />
      </TabsContent>
    </Tabs>
  );
}
