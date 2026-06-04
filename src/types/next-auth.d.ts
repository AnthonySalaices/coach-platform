import type { DefaultSession } from "next-auth";
import type { Role } from "@/server/db/schema";

// Surface our app-specific fields (stable user id + role) on the session and
// the JWT, so guards can read `session.user.role` without casting.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}
