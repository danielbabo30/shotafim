import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: UserRole[];
      activeRole: UserRole | null;
    } & DefaultSession["user"];
  }

  interface User {
    roles: UserRole[];
    activeRole: UserRole | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    roles: UserRole[];
    activeRole: UserRole | null;
  }
}
