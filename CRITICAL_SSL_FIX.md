# CRITICAL: Fix SSL Error for Clerk Authentication

## The Problem
Your Clerk is trying to load from a custom domain (likely `clerk.duomigo.com` or `accounts.duomigo.com`) that has SSL certificate issues, causing `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`.

## IMMEDIATE ACTIONS REQUIRED

### 1. Check Vercel Environment Variables
Remove these if they exist:
- ❌ `CLERK_DOMAIN`
- ❌ `NEXT_PUBLIC_CLERK_DOMAIN`
- ❌ `CLERK_FRONTEND_API`
- ❌ `NEXT_PUBLIC_CLERK_FRONTEND_API`
- ❌ `CLERK_PROXY_URL`
- ❌ `NEXT_PUBLIC_CLERK_PROXY_URL`

### 2. In Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Select your instance
3. Go to **Domains** section
4. **DISABLE or REMOVE** any custom domains:
   - Remove `clerk.duomigo.com`
   - Remove `accounts.duomigo.com`
   - Remove any other custom domains
5. Make sure **"Use default Clerk domains"** is enabled

### 3. In Clerk Dashboard - API Keys Section
Make sure you're using the correct instance:
- If `pk_live_...`: Production instance
- If `pk_test_...`: Development instance

The instance domain should be something like:
- `YOUR-INSTANCE.clerk.accounts.dev` (for test)
- `YOUR-INSTANCE.accounts.dev` (for live)

NOT a custom domain!

### 4. Verify Your Publishable Key
Your publishable key determines which Clerk instance you connect to.

For `pk_live_` keys, decode the base64 part after `pk_live_`:
```bash
echo "YOUR_BASE64_PART" | base64 -d
```

This will show your instance domain. It should be `*.clerk.accounts.dev`, NOT a custom domain.

### 5. Clear Browser Cache
After making changes:
1. Clear all cookies for duomigo.com
2. Clear browser cache
3. Try in incognito/private window

## Testing
After fixing:
1. Visit https://duomigo.com/test-clerk
2. Open browser console
3. Should see NO SSL errors
4. Should see "Auth Loaded: Yes"

## If Still Not Working
The issue is 100% that Clerk is trying to use a custom domain with bad SSL. You need to:

1. **Option A**: Fix the SSL certificate for your custom domain in Clerk Dashboard
2. **Option B**: Disable custom domains entirely and use default Clerk domains (recommended)

## Why This Happens
When you configure custom domains in Clerk but the SSL certificate isn't properly issued or configured, browsers block the connection for security reasons.

## Long-term Solution
Once SSL is properly configured for your custom domain (usually takes 24-48 hours after DNS verification), you can re-enable it. Until then, use the default Clerk domains.