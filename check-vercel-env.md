# Vercel Environment Variables Setup

## Required Environment Variables

You need to add these environment variables in your Vercel project settings:

### Public Variables (visible in browser)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (from Supabase dashboard)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key (from Supabase dashboard)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key (from Clerk dashboard)
- `NEXT_PUBLIC_SITE_URL` - Set to `https://duomigo.com`

### Server Variables (secret)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Supabase dashboard)
- `CLERK_SECRET_KEY` - Your Clerk secret key (from Clerk dashboard)

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add each variable:
   - Enter the Key (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the Value (from your Supabase/Clerk dashboards)
   - Select environments: Production, Preview, Development
   - Click "Save"

## Where to Find These Values

### Supabase (https://supabase.com/dashboard)
1. Select your project
2. Go to Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

### Clerk (https://dashboard.clerk.com)
1. Select your application
2. Go to API Keys
3. Copy:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret keys → `CLERK_SECRET_KEY`

## After Adding Variables

Once you've added all environment variables in Vercel:
1. Trigger a redeploy from Vercel dashboard
2. Or push any commit to trigger automatic deployment
