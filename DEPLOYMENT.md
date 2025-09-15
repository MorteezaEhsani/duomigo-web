# Deployment Checklist for Duomigo

## Prerequisites
- [ ] Vercel account with a project created
- [ ] Supabase project with database schema applied
- [ ] Domain configured in Vercel (optional but recommended)

## 1. Environment Variables in Vercel

Navigate to your Vercel project settings → Environment Variables and add:

### Required Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# Service Role Key (for server-side operations like seeding)
# ⚠️ NEVER expose this in client code
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

### Optional Variables (if using NextAuth or custom auth)
```env
# Only if you're using NextAuth.js
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-generated-secret-key
```

### Where to find these values:
1. **Supabase Dashboard** → Settings → API
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project API Key (anon/public)
   - `SUPABASE_SERVICE_ROLE_KEY`: Project API Key (service_role)

2. **NEXTAUTH_URL**: Your Vercel deployment URL (e.g., `https://duomigo.vercel.app`)

## 2. Supabase Authentication Settings

### Configure in Supabase Dashboard → Authentication → URL Configuration:

#### Site URL
```
https://your-domain.vercel.app
```
Or for preview deployments:
```
https://*.vercel.app
```

#### Redirect URLs (Add all of these)
```
https://your-domain.vercel.app/auth/callback
https://your-domain.vercel.app/login
https://your-domain.vercel.app/app
https://your-domain.vercel.app/**
https://*.vercel.app/**
```

### OAuth Provider Settings (if using)

#### Google OAuth
1. Go to Authentication → Providers → Google
2. Add your OAuth credentials from Google Cloud Console
3. Authorized redirect URIs in Google:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback
   ```

#### GitHub OAuth
1. Go to Authentication → Providers → GitHub
2. Add OAuth App credentials from GitHub Settings
3. Authorization callback URL in GitHub:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback
   ```

## 3. Database Setup

### Run Migrations
Ensure all migrations are applied in Supabase:

1. **Via Supabase Dashboard:**
   - SQL Editor → Run migrations in order:
     - `001_initial_schema.sql`
     - `002_add_timezone_support.sql`

2. **Seed Initial Data (Optional):**
   ```bash
   # Run locally with service role key
   pnpm seed
   ```

### Verify RLS Policies
- [ ] Check that Row Level Security is enabled on all tables
- [ ] Verify policies exist for authenticated users
- [ ] Test that policies work as expected

## 4. Pre-Deployment Checklist

- [ ] Run build locally to check for errors:
  ```bash
  pnpm build
  ```
- [ ] Test authentication flow locally
- [ ] Verify all API routes work with production Supabase
- [ ] Check that TypeScript has no errors:
  ```bash
  pnpm tsc --noEmit
  ```
- [ ] Run linter:
  ```bash
  pnpm lint
  ```

## 5. Deploy to Vercel

### Via GitHub Integration (Recommended)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Vercel will auto-deploy on push to main branch

### Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 6. Post-Deployment Smoke Tests

Run these tests on your production URL:

### Authentication Tests
- [ ] **Sign Up Flow:**
  1. Navigate to `/login`
  2. Sign up with email (magic link)
  3. Check email and click magic link
  4. Verify redirect to `/app`

- [ ] **OAuth Sign In:**
  1. Test Google OAuth login
  2. Test GitHub OAuth login
  3. Verify redirect to `/app` after success

- [ ] **Sign Out:**
  1. Click Sign Out button
  2. Verify redirect to home page
  3. Try accessing `/app` - should redirect to `/login`

### Core Functionality Tests
- [ ] **Dashboard (`/app`):**
  - Verify streak data loads
  - Check practice mode cards display
  - Test navigation to practice modes

- [ ] **Profile (`/app/profile`):**
  - Check profile loads with user data
  - Test updating display name
  - Verify changes persist after refresh

- [ ] **Practice Mode (`/app/practice/read_aloud`):**
  - Verify practice session starts
  - Check question loads
  - Test submit button (creates attempt)
  - Verify redirect to dashboard after submit

### API Endpoint Tests
- [ ] **Health Check:**
  ```bash
  curl https://your-domain.vercel.app/api/ping
  # Should return: {"ok":true,"user":null} or user ID if logged in
  ```

- [ ] **Activity Ping (authenticated):**
  ```bash
  # Test with authenticated session
  # Should update daily activity and return success
  ```

### Error Handling Tests
- [ ] **404 Page:**
  - Navigate to non-existent route
  - Verify 404 page displays

- [ ] **Invalid Practice Type:**
  - Navigate to `/app/practice/invalid_type`
  - Should show 404 error for unknown practice type

- [ ] **Network Errors:**
  - Test with slow network (DevTools throttling)
  - Verify loading skeletons appear
  - Check toast notifications for errors

## 7. Production Monitoring

### Set up monitoring for:
- [ ] **Vercel Analytics** - Enable in Vercel dashboard
- [ ] **Error Tracking** - Consider adding Sentry
- [ ] **Supabase Metrics:**
  - Database performance
  - Auth success/failure rates
  - API usage

### Monitor Key Metrics:
- Authentication success rate
- API response times
- Database query performance
- User activity patterns
- Error rates

## 8. Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback:**
   - Vercel Dashboard → Deployments → Redeploy previous version
   
2. **Database Rollback:**
   - Keep backup of database before major migrations
   - Have rollback SQL scripts ready

3. **Environment Variable Issues:**
   - Double-check all env vars are set correctly
   - Verify no spaces or quotes in values

## 9. Security Checklist

- [ ] Service role key is NOT exposed in client code
- [ ] All API routes validate authentication
- [ ] RLS policies are properly configured
- [ ] No sensitive data in console.logs
- [ ] CORS settings appropriate for production
- [ ] Rate limiting configured (if needed)

## 10. Performance Optimizations

- [ ] Images optimized and using Next.js Image component
- [ ] Database queries optimized with proper indexes
- [ ] API routes use proper caching headers
- [ ] Static pages are properly cached
- [ ] Bundle size is reasonable

## Common Issues & Solutions

### "Invalid API Key" Error
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- Check that the key matches your Supabase project

### OAuth Redirect Issues
- Ensure redirect URLs are added in Supabase
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check OAuth provider settings

### Database Connection Issues
- Verify Supabase project is not paused
- Check connection pooling settings
- Ensure RLS policies aren't blocking queries

### Build Failures
- Check all environment variables are set
- Verify TypeScript types are correct
- Ensure all dependencies are installed

## Support & Documentation

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Project Issues:** Create issue in GitHub repository

---

## Quick Deploy Commands

```bash
# Build and test locally
pnpm build
pnpm start

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

## Final Verification

After deployment is complete:
- [ ] All smoke tests pass
- [ ] No console errors in browser
- [ ] Performance is acceptable
- [ ] Authentication works correctly
- [ ] Data persists properly
- [ ] Error states handle gracefully

🚀 **Deployment Complete!**