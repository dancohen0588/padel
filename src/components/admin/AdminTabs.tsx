"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tournament, TournamentPhoto } from "@/lib/types";
import { TournamentsTab } from "@/components/admin/tabs/TournamentsTab";
import { HomePhotosTab } from "@/components/admin/tabs/HomePhotosTab";

type AdminTabsProps = {
  adminToken: string;
  tournaments: Tournament[];
  photos: TournamentPhoto[];
  featuredPhotos: TournamentPhoto[];
};

export function AdminTabs({
  adminToken,
  tournaments,
  photos,
  featuredPhotos,
}: AdminTabsProps) {
  return (
    <Tabs defaultValue="tournaments" className="w-full">
      <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card">
        <TabsTrigger value="tournaments">Tournois</TabsTrigger>
        <TabsTrigger value="photos">Home Photos</TabsTrigger>
      </TabsList>

      <TabsContent value="tournaments" className="mt-6">
        <TournamentsTab
          tournaments={tournaments}
          adminToken={adminToken}
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
    </Tabs>
  );
}
