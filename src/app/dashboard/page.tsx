import Link from "next/link";
import { requirePageUser } from "@/lib/page-auth";
import { adminCounts } from "@/server/db/repos/stats";

export default async function Overview() {
  const user = await requirePageUser();

  return (
    <>
      <h1 className="page">Welcome, {user.name ?? "there"}</h1>
      <p className="sub">
        You&apos;re signed in as{" "}
        <span className={`badge ${user.role}`}>{user.role}</span>.
      </p>

      {user.role === "admin" && <AdminStats />}

      <div className="card" style={{ marginTop: "1rem" }}>
        <strong>Quick links</strong>
        <ul style={{ margin: "0.5rem 0 0", lineHeight: 1.9 }}>
          <li>
            <Link href="/dashboard/coaches">Browse coaches</Link>
          </li>
          {(user.role === "client" || user.role === "admin") && (
            <li>
              <Link href="/dashboard/client">My bookings</Link>
            </li>
          )}
          {(user.role === "coach" || user.role === "admin") && (
            <li>
              <Link href="/dashboard/coach">My coaching</Link>
            </li>
          )}
          {user.role === "admin" && (
            <>
              <li>
                <Link href="/dashboard/admin/users">Manage users &amp; roles</Link>
              </li>
              <li>
                <Link href="/dashboard/admin/bookings">All bookings</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </>
  );
}

async function AdminStats() {
  const c = await adminCounts();
  const items: [string, number][] = [
    ["Users", c.users],
    ["Coaches", c.coaches],
    ["Services", c.services],
    ["Bookings", c.bookings],
  ];
  return (
    <div className="card-grid">
      {items.map(([label, n]) => (
        <div className="card stat" key={label}>
          <div className="n">{n}</div>
          <div className="l">{label}</div>
        </div>
      ))}
    </div>
  );
}
