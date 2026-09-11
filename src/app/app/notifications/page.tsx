import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { EmptyState } from "@/features/marketplace/components/empty-state";

export const metadata: Metadata = { title: "Notifications — FarmConnect" };

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <EmptyState
        icon={Bell}
        title="No notifications yet."
        description="Updates about your jobs and offers will appear here."
      />
    </div>
  );
}
