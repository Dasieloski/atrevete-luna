import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db'; // Assuming you have a drizzle instance

// Better-auth initialization (typically in lib/auth.ts)
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'postgresql', // or 'mysql', 'sqlite'
    schema: {
      user: 'users',
      session: 'sessions',
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  // Advanced features
  twoFactor: {
    enabled: true,
    // ... other 2fa settings
  },
  passkeys: {
    enabled: true,
    // ... passkey settings
  },
});

// Example usage in a component
/*
import { useSession, signIn, signOut } from 'better-auth/react';

function AuthComponent() {
  const { data: session, loading } = useSession();

  if (loading) return <div>Loading...</div>;

  return session ? (
    <div>
      <p>Welcome, {session.user.name}!</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  ) : (
    <div>
      <button onClick={() => signIn('google')}>Sign in with Google</button>
      <button onClick={() => signIn('email', { email: 'user@example.com' })}>
        Sign in with Email
      </button>
    </div>
  );
}
*/

export default auth;