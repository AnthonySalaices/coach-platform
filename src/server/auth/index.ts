import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { env } from "@/env";
import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";
import {
  getUserById,
  setDiscordIdIfMissing,
  setUserRole,
} from "@/server/db/repos/users";
import type { Role } from "@/server/db/schema";

const useSecureCookies = env.NODE_ENV === "production";

// Discord ids that should always be admin (bootstraps the first admin).
const ADMIN_DISCORD_IDS = new Set(
  (env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Discord({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST,
  // Stateless sessions: the (encrypted) JWT carries identity + role, so there's
  // no per-request session-table read and any number of instances can serve.
  session: { strategy: "jwt" },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // `user` is only present at sign-in — read the authoritative role once
      // and bake it into the token so steady-state requests hit no DB.
      if (user?.id) {
        const dbUser = await getUserById(user.id);
        let role: Role = dbUser?.role ?? "client";

        // Auto-grant admin to allowlisted Discord ids.
        const discordId =
          account?.provider === "discord"
            ? account.providerAccountId
            : (dbUser?.discordId ?? undefined);
        if (role !== "admin" && discordId && ADMIN_DISCORD_IDS.has(discordId)) {
          await setUserRole(user.id, "admin");
          role = "admin";
        }
        token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as Role | undefined) ?? "client";
      }
      return session;
    },
  },
  events: {
    // Runs after an OAuth account is linked to a user. Here `user.id` is our DB
    // id (unlike the signIn callback on first login, where `user.id` is the
    // Discord snowflake — which is why the old backfill silently matched no
    // rows). This reliably records the denormalized discord_id.
    async linkAccount({ user, account }) {
      if (account.provider === "discord" && user.id) {
        await setDiscordIdIfMissing(user.id, account.providerAccountId);
      }
    },
  },
});
