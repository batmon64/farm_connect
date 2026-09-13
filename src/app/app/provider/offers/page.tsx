import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyOffers } from "@/features/provider/queries";
import { MyOfferCard } from "@/features/provider/components/my-offer-card";
import { EmptyState } from "@/features/marketplace/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Offers — FarmConnect" };

export default async function MyOffersPage() {
  const supabase = await createClient();
  const offers = await getMyOffers(supabase);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My Offers</h1>

      {offers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="You haven't sent any offers yet."
          description="Offers you make on jobs will show up here so you can track their status."
          action={
            <Button asChild>
              <Link href="/app/provider/jobs">Find jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer) => (
            <MyOfferCard key={offer.offer_id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
