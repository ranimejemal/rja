import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { TicketThread } from "@/components/TicketThread";

export default async function SellerTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("seller");
  return (
    <>
      <Link className="tag" href="/seller/support">← Customer support</Link>
      <TicketThread ticketId={id} viewerId={session.userId} returnTo={`/seller/support/${id}`} />
    </>
  );
}
