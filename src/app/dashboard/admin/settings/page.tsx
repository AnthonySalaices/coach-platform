import { requirePageRole } from "@/lib/page-auth";
import { getSiteName } from "@/server/db/repos/settings";
import { updateSiteName } from "./actions";

export default async function AdminSettingsPage() {
  await requirePageRole("admin");
  const siteName = await getSiteName();

  return (
    <>
      <h1 className="page">Settings</h1>
      <p className="sub">Branding &amp; instance configuration.</p>

      <div className="card" style={{ maxWidth: 480 }}>
        <form action={updateSiteName} className="form">
          <label>
            Site name
            <input
              name="siteName"
              className="input"
              defaultValue={siteName}
              maxLength={60}
              required
            />
          </label>
          <div>
            <button className="btn-primary" type="submit">
              Save
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
            Appears in the top bar, landing page, and browser tab.
          </p>
        </form>
      </div>
    </>
  );
}
