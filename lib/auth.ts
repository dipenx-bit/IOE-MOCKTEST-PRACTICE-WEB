// lib/auth.ts
import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// ─── Extend NextAuth types ────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      fullName: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: Role;
    fullName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    fullName: string;
  }
}

// ─── Validation schema for credentials ───────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

// ─── Auth configuration ───────────────────────────────────────────────────────
export const authConfig: NextAuthConfig = {
  // Secret used to sign tokens. Read from NEXTAUTH_SECRET or fallback to AUTH_SECRET.
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  // Enable debug in development to surface JSON errors from NextAuth endpoints
  debug: process.env.NODE_ENV !== "production",

  adapter: PrismaAdapter(prisma) as any,

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn:  "/login",
    error:   "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validate input shape
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const { email, password } = parsed.data;

          // Fetch user from DB
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });
          

          if (!user) return null;

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash);
          
          if (!isValid) return null;

          return {
            id:       user.id,
            email:    user.email,
            name:     user.fullName,
            fullName: user.fullName,
            role:     user.role,
          };
        } catch (err) {
          console.error('[auth] authorize error', err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.role     = user.role;
        token.fullName = user.fullName;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id       = token.id;
        session.user.role     = token.role;
        session.user.fullName = token.fullName;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ─── Helper: get current session (server-side) ───────────────────────────────
export async function getSession() {
  return await auth();
}

// ─── Helper: require auth, redirect if not logged in ─────────────────────────
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

// ─── Helper: require admin role ───────────────────────────────────────────────
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

// ─── Helper: require student role ────────────────────────────────────────────
export async function requireStudent() {
  const session = await requireAuth();
  if (session.user.role !== "STUDENT") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
