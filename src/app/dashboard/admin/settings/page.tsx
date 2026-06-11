import { requirePageRole } from "@/lib/page-auth";
import { getSiteName } from "@/server/db/repos/settings";
import { getCopyOverrides } from "@/server/db/repos/siteCopy";
import { COPY_DEFAULTS, COPY_GROUPS } from "@/lib/site-copy";
import { updateSiteCopy, updateSiteName } from "./actions";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePageRole("admin");
  const { saved } = await searchParams;
  const siteName = await getSiteName();
  const overrides = await getCopyOverrides();

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

      <h2 className="copy-head">Site copy</h2>
      <p className="sub">
        Every piece of text on the landing and sign-in pages. Leave a field
        blank to use the default (shown as the placeholder).
      </p>

      {COPY_GROUPS.map((group) => (
        <div
          key={group.id}
          id={`copy-${group.id}`}
          className="card copy-card"
          style={{ maxWidth: 640 }}
        >
          <form action={updateSiteCopy} className="form">
            <input type="hidden" name="group" value={group.id} />
            <div className="copy-card-head">
              <strong>{group.title}</strong>
              {saved === group.id && (
                <span className="copy-saved">✓ saved</span>
              )}
            </div>
            {group.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.multiline ? (
                  <textarea
                    name={field.key}
                    className="input"
                    rows={Math.min(
                      6,
                      Math.max(
                        2,
                        COPY_DEFAULTS[field.key].split("\n").length,
                      ),
                    )}
                    defaultValue={overrides[field.key] ?? ""}
                    placeholder={COPY_DEFAULTS[field.key]}
                    maxLength={2000}
                  />
                ) : (
                  <input
                    name={field.key}
                    className="input"
                    defaultValue={overrides[field.key] ?? ""}
                    placeholder={COPY_DEFAULTS[field.key]}
                    maxLength={2000}
                  />
                )}
                {field.help && <span className="copy-help">{field.help}</span>}
              </label>
            ))}
            <div>
              <button className="btn-primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </div>
      ))}
    </>
  );
}
