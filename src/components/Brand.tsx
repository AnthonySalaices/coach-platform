import { getSiteName } from "@/server/db/repos/settings";
import { getLogo } from "@/server/db/repos/siteTheme";

/**
 * The site brand: admin-uploaded logo (settings `branding.logo`, a data URI)
 * next to the site name, or the default ⚡ bolt. Server component — drop it
 * inside any <Link>/<a> wrapper that handles navigation.
 */
export async function Brand() {
  const [siteName, logo] = await Promise.all([getSiteName(), getLogo()]);
  return (
    <>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URI, no optimizer benefit
        <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
      ) : (
        <span className="brand-bolt">⚡</span>
      )}{" "}
      {siteName}
    </>
  );
}
