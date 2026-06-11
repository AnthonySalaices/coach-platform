import { requirePageRole } from "@/lib/page-auth";
import { getSiteName } from "@/server/db/repos/settings";
import { getCopyOverrides } from "@/server/db/repos/siteCopy";
import { getLogo, getThemeOverrides } from "@/server/db/repos/siteTheme";
import { COPY_DEFAULTS, COPY_GROUPS } from "@/lib/site-copy";
import {
  THEME_DEFAULTS,
  THEME_LABELS,
  type ThemeKey,
} from "@/lib/site-theme";
import {
  removeLogo,
  resetThemeColors,
  updateLogo,
  updateSiteCopy,
  updateSiteName,
  updateThemeColors,
} from "./actions";

const LOGO_MESSAGES: Record<string, string> = {
  logo: "✓ logo updated",
  "logo-removed": "✓ logo removed",
  "logo-missing": "✗ pick a file first",
  "logo-type": "✗ unsupported file type (png/jpg/webp/svg)",
  "logo-size": "✗ too big — keep it under 300 KB",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePageRole("admin");
  const { saved } = await searchParams;
  const siteName = await getSiteName();
  const overrides = await getCopyOverrides();
  const themeOverrides = await getThemeOverrides();
  const logo = await getLogo();

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

      <h2 className="copy-head" id="branding">
        Branding
      </h2>
      <p className="sub">
        Logo and color scheme. Colors apply everywhere instantly; set one back
        to its default to stop overriding it.
      </p>

      <div className="card copy-card" style={{ maxWidth: 640 }}>
        <div className="copy-card-head">
          <strong>Logo</strong>
          {saved && LOGO_MESSAGES[saved] && (
            <span className="copy-saved">{LOGO_MESSAGES[saved]}</span>
          )}
        </div>
        <div className="logo-preview" style={{ margin: "0.8rem 0" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URI preview
            <img src={logo} alt="Current logo" />
          ) : (
            <span className="muted">
              No logo uploaded — the ⚡ bolt is shown.
            </span>
          )}
        </div>
        <form action={updateLogo} className="avail-form">
          <input
            type="file"
            name="logo"
            className="input"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ width: "auto" }}
          />
          <button className="btn-primary" type="submit">
            Upload
          </button>
        </form>
        {logo && (
          <form action={removeLogo} style={{ marginTop: "0.6rem" }}>
            <button className="btn" type="submit">
              Remove logo
            </button>
          </form>
        )}
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0.8rem 0 0" }}>
          PNG, JPG, WebP or SVG up to 300 KB. Shown next to the site name in
          the nav, dashboard and sign-in page.
        </p>
      </div>

      <div className="card copy-card" style={{ maxWidth: 640 }}>
        <form action={updateThemeColors} className="form" style={{ maxWidth: "none" }}>
          <div className="copy-card-head">
            <strong>Colors</strong>
            {saved === "colors" && <span className="copy-saved">✓ saved</span>}
            {saved === "colors-reset" && (
              <span className="copy-saved">✓ back to defaults</span>
            )}
          </div>
          <div className="color-grid">
            {(Object.keys(THEME_DEFAULTS) as ThemeKey[]).map((key) => (
              <label key={key}>
                <input
                  type="color"
                  name={key}
                  defaultValue={themeOverrides[key] ?? THEME_DEFAULTS[key]}
                />
                {THEME_LABELS[key]}
                {themeOverrides[key] && <span title="overridden">●</span>}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="btn-primary" type="submit">
              Save colors
            </button>
            <button className="btn" formAction={resetThemeColors} type="submit">
              Reset to defaults
            </button>
          </div>
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
