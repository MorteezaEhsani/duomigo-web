# 🚨 URGENT: Restore Missing Environment Variables in Vercel

## The Problem
All your environment variables are missing from Vercel, causing build failure.

## Immediate Action Required

Go to: **Vercel Dashboard → duomigo-web → Settings → Environment Variables**

Add ALL of these variables:

### 1. Clerk Authentication (REQUIRED)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_[your-key-here]
CLERK_SECRET_KEY=sk_live_[your-key-here]
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

### 2. Supabase Database (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL=https://ayrxmujruxhrkzuwmflx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key-here]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key-here]
```

### 3. OpenAI (REQUIRED)
```
OPENAI_API_KEY=[your-openai-api-key-here]
```

### 4. Site Configuration
```
NEXT_PUBLIC_SITE_URL=https://duomigo.com
```

### 5. Admin Access (Optional)
```
ADMIN_EMAILS=morteezaehsani@gmail.com
```

## Where to Find Your Keys

### Clerk Keys:
1. Go to https://dashboard.clerk.com
2. Select your production instance
3. Go to API Keys
4. Copy the Publishable key (starts with `pk_live_`)
5. Copy the Secret key (starts with `sk_live_`)

### Supabase Keys:
1. Go to https://supabase.com/dashboard
2. Select your project (ayrxmujruxhrkzuwmflx)
3. Go to Settings → API
4. Copy the URL, anon key, and service_role key

### OpenAI Key:
1. Go to https://platform.openai.com
2. API keys section
3. Create or copy existing key

## Important Steps:

1. **Add each variable one by one**
2. **For EACH variable, check ALL boxes:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

3. **Click "Save" after adding all variables**

4. **Redeploy:**
   - Go to Deployments tab
   - Click ⋮ menu → Redeploy
   - Can use cache this time

## Test After Deployment:
1. Check https://duomigo.com loads
2. Check https://duomigo.com/sign-up works
3. Check https://duomigo.com/admin/questions (with morteezaehsani@gmail.com)

## If You Lost Your Keys:
- **Clerk**: Can regenerate in dashboard (will need to update everywhere)
- **Supabase**: Service role key can be regenerated in dashboard
- **OpenAI**: Can create new key in platform

The build is failing because these environment variables are completely missing from Vercel!