import { fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { BookingDetail } from "@/server/db/repos/bookings";

export function BookingsTable({
  rows,
  columns,
}: {
  rows: BookingDetail[];
  columns: { client?: boolean; coach?: boolean };
}) {
  return (
    <table className="t">
      <thead>
        <tr>
          <th>When</th>
          {columns.client && <th>Client</th>}
          {columns.coach && <th>Coach</th>}
          <th>Service</th>
          <th>Price</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id}>
            <td>{fmtDateTime(b.startAt)}</td>
            {columns.client && <td>{b.clientName ?? "—"}</td>}
            {columns.coach && <td>{b.coachName ?? "—"}</td>}
            <td>{b.serviceTitle}</td>
            <td>{formatMoney(b.price, b.currency)}</td>
            <td>
              <span className={`badge ${b.status}`}>{b.status}</span>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="muted">
              No bookings yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
