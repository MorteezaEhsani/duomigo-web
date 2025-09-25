# Vercel Clerk Domain Fix Checklist

## ✅ Step-by-Step Instructions

### Step 1: Remove Custom Domain Variables in Vercel
Go to: **Vercel Dashboard → duomigo-web → Settings → Environment Variables**

**DELETE these variables completely** (if they exist):
- ❌ `CLERK_DOMAIN`
- ❌ `NEXT_PUBLIC_CLERK_DOMAIN`
- ❌ `CLERK_FRONTEND_API`
- ❌ `NEXT_PUBLIC_CLERK_FRONTEND_API`
- ❌ `CLERK_PROXY_URL`
- ❌ `NEXT_PUBLIC_CLERK_PROXY_URL`
- ❌ `CLERK_API_URL`
- ❌ `CLERK_API_VERSION`

### Step 2: Verify These Variables ARE Set
**KEEP these variables** (should already be there):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your pk_live_ key]
CLERK_SECRET_KEY=[your sk_live_ key]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

Also keep your existing:
```
NEXT_PUBLIC_SUPABASE_URL=[your value]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your value]
SUPABASE_SERVICE_ROLE_KEY=[your value]
OPENAI_API_KEY=[your value]
NEXT_PUBLIC_SITE_URL=https://duomigo.com
```

### Step 3: Redeploy WITHOUT Cache
1. Go to **Vercel Dashboard → duomigo-web → Deployments**
2. Click the **three dots** menu on the latest deployment
3. Select **"Redeploy"**
4. **IMPORTANT**: UNCHECK ☐ "Use existing Build Cache"
5. Click **"Redeploy"**

### Step 4: Clear Your Browser
While waiting for deployment:
1. Clear all cookies for duomigo.com
2. Clear browser cache
3. Close all duomigo.com tabs

### Step 5: Test After Deployment
Once deployed (takes 2-3 minutes):
1. Open a **new incognito/private window**
2. Go to: `https://duomigo.com/test-clerk`
3. Check that it shows:
   - Auth Loaded: Yes (might take a second)
   - No SSL errors in console
4. Go to: `https://duomigo.com/sign-up`
5. The sign-up form should appear!

## What This Does
- Forces Clerk to use its default domain: `ins-338vusC4LuNLCnBiZrXZhdtKXrw.clerk.accounts.dev`
- Bypasses the broken SSL on custom domains
- Your app will work immediately

## Expected Console Output
On `/test-clerk` page, you should see in console:
```
=== CLERK DEBUG INFO ===
Publishable Key: EXISTS
Sign In URL: /sign-in
Sign Up URL: /sign-up
After Sign In URL: /app
After Sign Up URL: /app
Auth Loaded: true
Window.Clerk exists: true
```

## If It Still Doesn't Work
1. **Double-check Vercel**: Make sure NO custom domain variables exist
2. **Check Clerk Dashboard**:
   - Go to https://dashboard.clerk.com
   - Select your instance
   - Under "Domains" → Remove any custom domains
   - Under "Paths" → Verify the URLs are set correctly
3. **Try a different browser**: Sometimes cache persists

## Code Status
✅ Your code is clean - no custom domain references
✅ ClerkProvider is properly configured
✅ All authentication pages are set up correctly

## DO NOT:
- Add any CLERK_DOMAIN variables
- Try to use clerk.duomigo.com
- Try to use accounts.duomigo.com
- Change DNS records

Just let Clerk use its default domain and everything will work!