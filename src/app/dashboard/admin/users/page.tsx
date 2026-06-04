import { requirePageRole } from "@/lib/page-auth";
import { listUsers } from "@/server/db/repos/users";
import { LocalTime } from "@/components/LocalTime";
import { changeRole } from "./actions";
import { startViewAs } from "@/lib/view-as-actions";

export default async function AdminUsersPage() {
  const me = await requirePageRole("admin");
  const users = await listUsers();

  return (
    <>
      <h1 className="page">Users</h1>
      <p className="sub">
        {users.length} users. Change a role and hit Update.
      </p>

      <div className="card">
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Role</th>
              <th>Change role</th>
              <th>View as</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name ?? "—"}
                  {u.id === me.id && <span className="muted"> (you)</span>}
                </td>
                <td className="muted">{u.email ?? "—"}</td>
                <td className="muted">
                  <LocalTime value={u.createdAt.toISOString()} mode="datetime" />
                </td>
                <td>
                  <span className={`badge ${u.role}`}>{u.role}</span>
                </td>
                <td>
                  <form
                    action={changeRole}
                    style={{ display: "flex", gap: "0.4rem" }}
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="input"
                    >
                      <option value="client">client</option>
                      <option value="coach">coach</option>
                      <option value="admin">admin</option>
                    </select>
                    <button className="btn" type="submit">
                      Update
                    </button>
                  </form>
                </td>
                <td>
                  {u.id === me.id ? (
                    <span className="muted">—</span>
                  ) : (
                    <form action={startViewAs}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn" type="submit">
                        View as
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
        A role change takes effect in that user&apos;s session only after they
        sign out and back in (the role is carried in their JWT).
      </p>
    </>
  );
}
