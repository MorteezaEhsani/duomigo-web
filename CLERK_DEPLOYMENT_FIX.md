# Clerk Production Deployment Fix for Duomigo

## 1. Environment Variables for Vercel

### KEEP These Environment Variables (Copy exactly as shown):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRlZC1tb25rZmlzaC03My5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_KHY7HAXMoJiFPHxWnf5r6Z2IVcLCYiwDiRLTUYc1KK
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

### REMOVE These Environment Variables (if present):
```
CLERK_FRONTEND_API (remove this)
NEXT_PUBLIC_CLERK_FRONTEND_API (remove this)
CLERK_API_URL (remove this)
CLERK_API_VERSION (remove this)
CLERK_DOMAIN (remove this)
NEXT_PUBLIC_CLERK_DOMAIN (remove this)
```

### Also Make Sure You Have These:
```
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
OPENAI_API_KEY=[your-openai-key]
NEXT_PUBLIC_SITE_URL=https://duomigo.com
```

## 2. Updated ClerkProvider Configuration

Your current setup in `/src/app/layout.tsx` is correct:

```tsx
<ClerkProvider publishableKey={ENV.CLERK_PUBLISHABLE_KEY}>
  {/* children */}
</ClerkProvider>
```

Or if you want to use the env variable directly:

```tsx
<ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
  {/* children */}
</ClerkProvider>
```

## 3. Clerk Dashboard Configuration

Go to your Clerk Dashboard (https://dashboard.clerk.com) and configure:

### Under "Paths" section:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/app`
- After sign-up URL: `/app`

### Under "Domains" section (Production Instance):
**Add these allowed origins:**
```
https://duomigo.com
https://www.duomigo.com
http://localhost:3000
```

### Under "Redirect URLs" (if using OAuth):
```
https://duomigo.com/sso-callback
https://www.duomigo.com/sso-callback
http://localhost:3000/sso-callback
```

### IMPORTANT: Disable Custom Domains for Now
In Clerk Dashboard → Settings → Domains:
- DO NOT configure custom domains (clerk.duomigo.com) until SSL is ready
- Let Clerk use the default `excited-monkfish-73.clerk.accounts.dev` domain

## 4. Step-by-Step Vercel Redeploy Instructions

### Step 1: Update Environment Variables in Vercel
1. Go to https://vercel.com/dashboard
2. Select your `duomigo-web` project
3. Go to Settings → Environment Variables
4. Delete any custom Clerk domain variables (listed above in REMOVE section)
5. Add/Update the variables from the KEEP section above
6. Make sure all variables are set for Production, Preview, and Development

### Step 2: Clear Vercel Cache and Redeploy
```bash
# Option A: From Vercel Dashboard
1. Go to your project dashboard
2. Click on "Deployments" tab
3. Click the three dots menu on the latest deployment
4. Select "Redeploy"
5. CHECK the box "Use existing Build Cache" should be UNCHECKED
6. Click "Redeploy"

# Option B: From Terminal (if you have Vercel CLI)
vercel --prod --force
```

### Step 3: Verify Deployment
After deployment completes:
1. Open https://duomigo.com in an incognito/private browser window
2. Navigate to https://duomigo.com/sign-up
3. Check browser console - should see no Clerk errors
4. Try signing up with an email

## 5. Middleware Configuration Check

Make sure your `middleware.ts` file has:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/admin(.*)',
  '/api/admin(.*)',
  '/feedback(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ]
}
```

## 6. Troubleshooting Checklist

If issues persist after redeployment:

1. **Check Clerk Instance Type**: Make sure you're using the TEST keys above (they start with `pk_test_` and `sk_test_`)

2. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

3. **Check Network Tab**:
   - Should see requests to `excited-monkfish-73.clerk.accounts.dev`
   - NOT to `clerk.duomigo.com` or `accounts.duomigo.com`

4. **Verify in Vercel Logs**:
   - Go to Vercel Dashboard → Functions tab
   - Check for any server-side errors

5. **Test Locally First**:
   ```bash
   # Create .env.local with the same variables
   pnpm dev
   # Visit http://localhost:3000/sign-up
   ```

## 7. After SSL is Ready (Future)

Once your custom domain SSL is verified and active:

1. Add these variables back:
```
NEXT_PUBLIC_CLERK_DOMAIN=clerk.duomigo.com
```

2. Update Clerk Dashboard to use custom domain

3. Redeploy

## Need Production Keys?

If you need to switch to production Clerk instance:
1. Create a production instance in Clerk Dashboard
2. Get new keys (will start with `pk_live_` and `sk_live_`)
3. Update all environment variables in Vercel
4. Ensure duomigo.com is added as allowed origin in the production instance

---

**IMPORTANT**: The key issue is that you're trying to use custom domains before SSL is ready. Using the default Clerk endpoints will fix this immediately.