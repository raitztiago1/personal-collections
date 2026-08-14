import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { assertAuthBoot } from "@/lib/auth-boot";
import { autenticarPorCredenciais } from "@/lib/auth-login";
import { prisma } from "@/lib/db";
import { ipDoRequest } from "@/lib/rate-limit";

assertAuthBoot({
  nodeEnv: process.env.NODE_ENV,
  authSecret: process.env.AUTH_SECRET,
  authUrl: process.env.AUTH_URL,
  nextPhase: process.env.NEXT_PHASE,
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.NODE_ENV !== "production",
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request?: Request) {
        const email = credentials.email;
        const password = credentials.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const ip = request ? ipDoRequest(request.headers) : "local";

        return autenticarPorCredenciais(
          { email, senha: password, ip },
          {
            findByEmail: (emailLookup) =>
              prisma.usuario.findUnique({ where: { email: emailLookup } }),
            compare: (senha, hash) => bcrypt.compare(senha, hash),
          },
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
