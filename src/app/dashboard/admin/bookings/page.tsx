import { requirePageRole } from "@/lib/page-auth";
import { listBookingsDetailed } from "@/server/db/repos/bookings";
import { BookingsTable } from "@/components/BookingsTable";

export default async function AdminBookingsPage() {
  await requirePageRole("admin");
  const rows = await listBookingsDetailed();

  return (
    <>
      <h1 className="page">All bookings</h1>
      <p className="sub">{rows.length} bookings across the platform.</p>
      <div className="card">
        <BookingsTable rows={rows} columns={{ client: true, coach: true }} />
      </div>
    </>
  );
}
