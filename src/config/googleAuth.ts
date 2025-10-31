import passport from "passport";
import {
  Strategy as GoogleStrategy,
 type Profile,
 type StrategyOptions,
} from "passport-google-oauth20";
import dotenv from "dotenv";
import { PrismaClient, type User } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();

// ✅ Define config and assert correct type
const googleOptions: StrategyOptions = {
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "https://www.gartanggali.com/backend/api/v1/auth/google/callback",
  passReqToCallback: false, // explicitly set this
};

console.log("Google callback URL:", process.env.GOOGLE_CLIENT_ID, googleOptions.callbackURL);


passport.use(
  // ✅ Force TypeScript to use the right overload
  new (GoogleStrategy as new (
    options: StrategyOptions,
    verify: (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: User | false | null) => void
    ) => void
  ) => GoogleStrategy)(
    googleOptions,
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: User | false | null) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value ?? "";
        const name = profile.displayName ?? "Unknown User";

        if (!email) {
          return done(new Error("Email not found in Google profile"), false);
        }

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              password: "", // no password since Google handles auth
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || false);
  } catch (err) {
    done(err as Error, false);
  }
});


export default passport;
