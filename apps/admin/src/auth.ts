import { connectDb, verifyAdminPassword, type AdminRole } from "@bookoran/db";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

/**
 * Admin authentication against the `adminUsers` collection.
 *
 * The password is compared with bcrypt inside verifyAdminPassword(), which
 * also hashes when the e-mail is unknown so a wrong address and a wrong
 * password take the same time. This replaced the plaintext `===` check
 * against ADMIN_EMAIL / ADMIN_PASSWORD; those variables are now read only by
 * the seed script.
 *
 * Accounts come from `npm run seed --workspace @bookoran/db`. There is no
 * fallback account and no default password: if the collection is empty,
 * nobody can sign in, which is the correct failure.
 */

const Credential = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = Credential.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          await connectDb();
        } catch {
          // The database being down must read as "cannot sign in", never as
          // "signed in". Returning null is the safe direction.
          return null;
        }

        const user = await verifyAdminPassword(email, password);
        if (!user) return null;

        // Best effort: a failed timestamp write must not fail the login.
        user.lastLoginAt = new Date();
        await user.save().catch(() => {});

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // The role travels in the JWT so route handlers can authorise without a
    // database round-trip on every request.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AdminRole }).role ?? "staff";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.role = (token.role as AdminRole) ?? "staff";
      return session;
    },
  },
});
