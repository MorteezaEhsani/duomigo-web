# Production Clerk Setup for Duomigo

## You have a PRODUCTION Clerk instance (pk_live_)

This is good! Production instances are meant for live applications.

## Required Environment Variables in Vercel

### 1. Your Clerk Keys (keep your existing pk_live_ keys):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[Your pk_live_... key]
CLERK_SECRET_KEY=[Your sk_live_... key]
```

### 2. ADD these URL configurations (CRITICAL - these are missing!):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

## Important Clerk Dashboard Settings

Since you're using a **production** instance, make sure in your Clerk Dashboard:

1. **Go to**: https://dashboard.clerk.com → Select your production instance

2. **Under Paths section**, set:
   - Sign-in path: `/sign-in`
   - Sign-up path: `/sign-up`
   - After sign-in path: `/app`
   - After sign-up path: `/app`

3. **Under Domains section**, add these to **Production origins**:
   - `https://duomigo.com`
   - `https://www.duomigo.com`
   - `http://localhost:3000` (for local development)

4. **Under Authentication → Email**, ensure:
   - Email address is enabled
   - Email verification is configured (optional but recommended)

5. **Under Security**, consider enabling:
   - Bot protection
   - Attack protection

## Differences between test and live keys:

- **pk_test_/sk_test_**: Development instances, free, unlimited users for testing
- **pk_live_/sk_live_**: Production instances, for real users, may have billing

## Troubleshooting

If you see "Application not found" or similar errors:
1. Make sure duomigo.com is added to allowed origins in Clerk Dashboard
2. Ensure you're using the correct production instance keys
3. Clear your browser cache and cookies

## Next Steps

1. Add the missing URL environment variables to Vercel
2. Ensure your Clerk Dashboard has duomigo.com configured
3. Redeploy on Vercel
4. Test at https://duomigo.com/test-clerk

Your sign-up should work immediately after adding these variables!