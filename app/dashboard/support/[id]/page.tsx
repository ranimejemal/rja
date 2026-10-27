import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TicketThread } from "@/components/TicketThread";

export default async function BuyerTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/dashboard/support/${id}`);
  return (
    <>
      <Link className="tag" href="/dashboard/support">← Support requests</Link>
      <TicketThread ticketId={id} viewerId={session.userId} returnTo={`/dashboard/support/${id}`} />
    </>
  );
}
