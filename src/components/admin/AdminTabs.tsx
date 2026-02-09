"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  RegistrationWithPlayer,
  RegistrationStatus,
  Tournament,
  TournamentPhoto,
} from "@/lib/types";
import { UsersApprovalTab } from "@/components/admin/tabs/UsersApprovalTab";
import { UsersValidatedTab } from "@/components/admin/tabs/UsersValidatedTab";
import { TournamentsTab } from "@/components/admin/tabs/TournamentsTab";
import { HomePhotosTab } from "@/components/admin/tabs/HomePhotosTab";

type AdminTabsProps = {
  adminToken: string;
  registrations: RegistrationWithPlayer[];
  statusCounts: Record<RegistrationStatus, number>;
  tournaments: Tournament[];
  photos: TournamentPhoto[];
  featuredPhotos: TournamentPhoto[];
};

export function AdminTabs({
  adminToken,
  registrations,
  statusCounts,
  tournaments,
  photos,
  featuredPhotos,
}: AdminTabsProps) {
  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card">
        <TabsTrigger value="pending">À valider</TabsTrigger>
        <TabsTrigger value="approved">Validés</TabsTrigger>
        <TabsTrigger value="tournaments">Tournois</TabsTrigger>
        <TabsTrigger value="photos">Home Photos</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-6">
        <UsersApprovalTab
          registrations={registrations}
          statusCounts={statusCounts}
          adminToken={adminToken}
        />
      </TabsContent>
      <TabsContent value="approved" className="mt-6">
        <UsersValidatedTab
          registrations={registrations}
          statusCounts={statusCounts}
          adminToken={adminToken}
        />
      </TabsContent>
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
