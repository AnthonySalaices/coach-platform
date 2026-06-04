import Link from "next/link";
import { getIdentity } from "@/lib/page-auth";
import { stopViewAs } from "@/lib/view-as-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, impersonating } = await getIdentity();
  const role = user.role;

  return (
    <div>
      {impersonating && (
        <div className="viewas-banner">
          <span>
            👁 Viewing as <strong>{user.name ?? user.email}</strong>{" "}
            <span className={`badge ${role}`}>{role}</span>
          </span>
          <form action={stopViewAs}>
            <button className="btn" type="submit">
              Exit view
            </button>
          </form>
        </div>
      )}
      <header className="topbar">
        <Link className="brand" href="/dashboard" style={{ color: "var(--fg)" }}>
          Coaching Platform
        </Link>
        <div className="who">
          <span>{user.name ?? user.email}</span>
          <span className={`badge ${role}`}>{role}</span>
          <Link className="btn" href="/api/auth/signout" prefetch={false}>
            Sign out
          </Link>
        </div>
      </header>

      <div className="shell">
        <nav className="sidebar">
          <Link className="nav-link" href="/dashboard">
            Overview
          </Link>
          <Link className="nav-link" href="/dashboard/coaches">
            Browse coaches
          </Link>

          {(role === "client" || role === "admin") && (
            <>
              <div className="group-label">Client</div>
              <Link className="nav-link" href="/dashboard/client">
                My bookings
              </Link>
            </>
          )}

          {(role === "coach" || role === "admin") && (
            <>
              <div className="group-label">Coach</div>
              <Link className="nav-link" href="/dashboard/coach">
                My coaching
              </Link>
            </>
          )}

          {role === "admin" && (
            <>
              <div className="group-label">Admin</div>
              <Link className="nav-link" href="/dashboard/admin/users">
                Users
              </Link>
              <Link className="nav-link" href="/dashboard/admin/bookings">
                All bookings
              </Link>
            </>
          )}
        </nav>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
