# Clerk Authentication Migration Guide

## Why Clerk?

We've migrated from Supabase Auth to Clerk because:
- ✅ **Better email verification flow** - No more stuck confirmation pages
- ✅ **Pre-built UI components** - Professional auth UI out of the box
- ✅ **Better OAuth support** - Google, GitHub, and more work seamlessly
- ✅ **Better developer experience** - Clear errors, great docs
- ✅ **Keep using Supabase for data** - Only auth changes, your database stays the same

## Setup Instructions

### 1. Create a Clerk Account

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Choose your authentication methods:
   - Email (with magic link or password)
   - Google OAuth
   - GitHub OAuth
   - Any others you want

### 2. Get Your Clerk Keys

In your Clerk Dashboard:
1. Go to **API Keys**
2. Copy these values:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 3. Update Environment Variables

Add to your `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs (optional - defaults work fine)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app

# Keep your Supabase variables for data
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Configure Clerk Dashboard

#### Paths & URLs
Go to **Paths** in Clerk Dashboard and set:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/app`
- After sign-up URL: `/app`

#### Email & SMS
- Customize your email templates
- Add your brand name and colors

#### OAuth Providers
For Google:
1. Go to **Social Connections** → **Google**
2. Toggle it on
3. Add your Google OAuth credentials (or use Clerk's dev keys)

For GitHub:
1. Go to **Social Connections** → **GitHub**
2. Toggle it on
3. Add your GitHub OAuth credentials (or use Clerk's dev keys)

### 5. Apply Database Migration

Run the migration to add Clerk support to your Supabase database:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/003_add_clerk_support.sql
```

This migration:
- Adds `clerk_user_id` column to profiles
- Creates helper functions for Clerk → Supabase user mapping
- Updates RLS policies to work with service role

### 6. Test the New Auth Flow

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Test sign-up flow:**
   - Go to `http://localhost:3000`
   - Click "Get Started"
   - Sign up with email or OAuth
   - Verify you're redirected to `/app`

3. **Test sign-in flow:**
   - Sign out (user button → sign out)
   - Click "Sign in"
   - Sign in with your account
   - Verify you're redirected to `/app`

## What Changed?

### Authentication Components

**Before (Supabase):**
- Custom login page with magic link
- Manual session management
- Complex callback handling

**After (Clerk):**
- Pre-built `<SignIn />` and `<SignUp />` components
- Automatic session management
- Built-in user button with avatar

### API Routes

**Before:**
```typescript
// Using Supabase auth
const { data: { user } } = await supabase.auth.getUser();
```

**After:**
```typescript
// Using Clerk auth
const { userId } = await auth();
```

### Protected Routes

**Before:**
- Manual route protection in each page
- Custom `SessionGuard` component

**After:**
- Middleware-based protection
- Automatic redirects to sign-in

### User Data Flow

1. User signs up/in with Clerk
2. Clerk provides a unique `userId`
3. We map this to a Supabase user record
4. All data operations continue using Supabase

## File Changes Summary

### New Files
- `src/middleware.ts` - Clerk middleware for route protection
- `src/app/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in page
- `src/app/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up page
- `src/components/NavClerk.tsx` - Navigation with Clerk components
- `src/lib/clerk-supabase.ts` - Helper functions for Clerk-Supabase integration

### Updated Files
- `src/app/layout.tsx` - Added ClerkProvider
- `src/app/page.tsx` - Uses Clerk auth
- `src/app/api/ping/route.ts` - Uses Clerk auth
- `src/app/api/activity/ping/route.ts` - Uses Clerk auth
- All API routes now use Clerk for authentication

### Deprecated Files (can be removed)
- `src/app/login/page.tsx` - Replaced by Clerk components
- `src/app/auth/callback/route.ts` - No longer needed
- `src/components/SessionGuard.tsx` - Replaced by middleware
- `src/lib/supabase/server.ts` - Auth functions replaced by Clerk

## Deployment to Vercel

### 1. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Update Clerk Production Instance
1. Switch to production keys in Clerk Dashboard
2. Update domain settings to your Vercel domain
3. Configure production OAuth redirect URLs

### 3. Deploy
```bash
git add .
git commit -m "Migrate auth from Supabase to Clerk"
git push
```

## Troubleshooting

### "User not found in Supabase"
- The first sign-in creates a Supabase user record
- Check the `profiles` table for `clerk_user_id`

### "Unauthorized" errors
- Ensure Clerk keys are set correctly
- Check middleware.ts matcher patterns
- Verify Clerk session is active

### OAuth not working
- Check redirect URLs in provider settings
- Ensure Clerk OAuth is configured
- Verify domain is whitelisted

## Benefits of This Migration

1. **Instant email verification** - No more confirmation page issues
2. **Professional UI** - Clerk's components look great out of the box
3. **Better security** - Clerk handles all auth security concerns
4. **Easier maintenance** - Less auth code to maintain
5. **Better user experience** - Smooth sign-in/up flows

## Next Steps

1. ✅ Test all auth flows locally
2. ✅ Deploy to Vercel
3. ✅ Test in production
4. 🎉 Enjoy reliable authentication!

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Discord](https://discord.com/invite/b5rXHjAg7A) for support