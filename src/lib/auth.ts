import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { User } from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.roleName = (user as any).roleName;
        token.isPlayer = (user as any).isPlayer;
        token.playerId = (user as any).playerId;
      }
      // A parent's login can hold several children; the portal switches the
      // active one with useSession().update({ playerId }). The id comes from
      // the browser, so it is only accepted when that child is on this login.
      if (trigger === "update" && typeof session?.playerId === "string" && token.id) {
        const owned = await db.player.findFirst({
          where: { id: session.playerId, userId: token.id as string },
          select: { id: true },
        });
        if (owned) token.playerId = owned.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).roleName = token.roleName;
        (session.user as any).isPlayer = token.isPlayer;
        (session.user as any).playerId = token.playerId;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true, players: { orderBy: { createdAt: "asc" }, select: { id: true } } },
        });

        if (!user || !user.password) return null;
        if (!user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role?.name ?? null,
          roleName: user.role?.name ?? null,
          isPlayer: user.players.length > 0,
          // The first child is active after sign-in; siblings are a switch away.
          playerId: user.players[0]?.id ?? null,
        } as User & { role: string; roleName: string; isPlayer: boolean; playerId: string | null };
      },
    }),
  ],
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
