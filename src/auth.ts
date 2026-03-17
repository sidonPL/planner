import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email offline_access Calendars.Read",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
          householdId: user.householdId,
          level: user.level,
          xp: user.xp,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers create/update user
      if (account?.provider !== "credentials" && user.email) {
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split("@")[0],
                avatar: user.image || null,
                role: UserRole.USER,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
              },
            });
          }

          // Create or update Account record for OAuth provider
          if (account) {
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: dbUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | null | undefined,
                },
              });
            } else {
              // Update existing account with new tokens
              await prisma.account.update({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
                data: {
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | null | undefined,
                },
              });
            }
          }

          // Save OAuth tokens for calendar sync
          if (account && (account.provider === "google" || account.provider === "microsoft-entra-id")) {
            const calendarType = account.provider === "google" ? "GOOGLE" : "OUTLOOK";

            // Find existing integration
            const existingIntegration = await prisma.calendarIntegration.findFirst({
              where: {
                userId: dbUser.id,
                type: calendarType,
              },
            });

            if (existingIntegration) {
              // Update existing
              await prisma.calendarIntegration.update({
                where: { id: existingIntegration.id },
                data: {
                  accessToken: account.access_token || "",
                  refreshToken: account.refresh_token || null,
                  tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
                  isActive: true,
                  lastSync: new Date(),
                  lastSyncStatus: "SUCCESS",
                },
              });
            } else {
              // Create new
              await prisma.calendarIntegration.create({
                data: {
                  userId: dbUser.id,
                  type: calendarType,
                  name: `Kalendarz ${account.provider === "google" ? "Google" : "Microsoft"}`,
                  accessToken: account.access_token || "",
                  refreshToken: account.refresh_token || null,
                  tokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
                  isActive: true,
                  syncInterval: 60,
                },
              });
            }
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.householdId = user.householdId;
        token.level = user.level;
        token.xp = user.xp;
        token.currentStreak = user.currentStreak;
        token.longestStreak = user.longestStreak;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.householdId = token.householdId as string | null;
        session.user.level = token.level as number | undefined;
        session.user.xp = token.xp as number | undefined;
        session.user.currentStreak = token.currentStreak as number | undefined;
        session.user.longestStreak = token.longestStreak as number | undefined;
      }
      return session;
    },
  },
});

