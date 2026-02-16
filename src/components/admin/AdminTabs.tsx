"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentConfig, Tournament, TournamentPhoto } from "@/lib/types";
import { TournamentsTab } from "@/components/admin/tabs/TournamentsTab";
import { HomePhotosTab } from "@/components/admin/tabs/HomePhotosTab";
import { PhotosTab } from "@/components/admin/tabs/PhotosTab";
import { PaymentsTab } from "@/components/admin/tabs/PaymentsTab";

type AdminTabsProps = {
  adminToken: string;
  tournaments: Tournament[];
  photos: TournamentPhoto[];
  featuredPhotos: TournamentPhoto[];
  paymentConfig: PaymentConfig;
  homeConfig?: {
    id: string;
    cover_photo_url: string | null;
  } | null;
  homeGallery?: {
    id: string;
    photo_url: string;
    caption: string | null;
    display_order: number;
  }[];
};

export function AdminTabs({
  adminToken,
  tournaments,
  photos,
  featuredPhotos,
  paymentConfig,
  homeConfig,
  homeGallery = [],
}: AdminTabsProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  return (
    <Tabs defaultValue="tournaments" className="w-full">
      <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card">
        <TabsTrigger value="tournaments">Tournois</TabsTrigger>
        <TabsTrigger value="payments">Paiements</TabsTrigger>
        <TabsTrigger value="photos">Home Photos</TabsTrigger>
        <TabsTrigger value="home-gallery">Photos (Storage)</TabsTrigger>
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
      <TabsContent value="photos" className="mt-6">
        <HomePhotosTab
          adminToken={adminToken}
          photos={photos}
          featuredPhotos={featuredPhotos}
          tournaments={tournaments}
        />
      </TabsContent>
      <TabsContent value="home-gallery" className="mt-6">
        <PhotosTab
          adminToken={adminToken}
          config={homeConfig ?? null}
          photos={homeGallery}
        />
      </TabsContent>
    </Tabs>
  );
}
