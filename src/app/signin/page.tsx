import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/server/auth";
import { getSiteCopy } from "@/server/db/repos/siteCopy";
import { Brand } from "@/components/Brand";

export const metadata = { title: "Sign in" };

// Human-readable copy for Auth.js error codes (?error=... on failed attempts).
const ERROR_COPY: Record<string, string> = {
  OAuthAccountNotLinked:
    "That Discord account's email is already tied to a different login. Sign in with the account you used originally.",
  AccessDenied: "Sign-in was cancelled or denied on Discord. No harm done — try again whenever.",
  Configuration: "Sign-in is misconfigured on our end. Ping the site owner.",
  Verification: "That sign-in link expired. Start again from here.",
};

/** Only allow same-site relative paths as post-login destinations. */
function safeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallbackUrl(callbackUrl);

  // Already signed in? Skip the ceremony.
  const session = await auth();
  if (session?.user) redirect(redirectTo);

  const copy = await getSiteCopy();
  const errorMessage = error
    ? (ERROR_COPY[error] ?? "Something went wrong during sign-in. Try again.")
    : null;

  return (
    <div className="signin-root">
      <nav className="landing-nav">
        <Link href="/" className="brand signin-brand">
          <Brand />
        </Link>
        <Link href="/" className="nav-ghost">
          ← back to site
        </Link>
      </nav>

      <main className="signin-main">
        <div className="signin-panel hud-frame">
          <span className="eyebrow">{copy["signin.eyebrow"]}</span>
          <h1 className="signin-title">{copy["signin.title"]}</h1>
          <p className="signin-sub">{copy["signin.sub"]}</p>

          {errorMessage && <p className="signin-error">{errorMessage}</p>}

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo });
            }}
          >
            <button type="submit" className="btn-discord">
              <svg
                className="discord-mark"
                viewBox="0 0 127.14 96.36"
                aria-hidden="true"
                fill="currentColor"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              {copy["signin.button"]}
            </button>
          </form>

          <ul className="signin-trust">
            <li>
              <span className="ok">✓</span> {copy["signin.trust.yes"]}
            </li>
            <li>
              <span className="no">✗</span> {copy["signin.trust.no1"]}
            </li>
            <li>
              <span className="no">✗</span> {copy["signin.trust.no2"]}
            </li>
          </ul>
        </div>

        <p className="signin-foot">{copy["signin.foot"]}</p>
      </main>
    </div>
  );
}
