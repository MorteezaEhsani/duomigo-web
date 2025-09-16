# Duomigo Web

Next.js 15 application with Turbopack, TypeScript, Tailwind CSS, Supabase, and Clerk authentication.

## Getting Started

### Prerequisites
- Node.js 20+ (check `.nvmrc`)
- pnpm 8+

### Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Release Checklist

### Before Deploying to Production

1. **Verify Environment Variables**
   ```bash
   # Check all required env vars are set
   pnpm tsx scripts/ci-verify-env.ts
   ```

2. **Required Environment Variables in Vercel**

   **Public Variables (NEXT_PUBLIC_*):**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
   - `NEXT_PUBLIC_SITE_URL` - Production URL (https://duomigo.com)

   **Server Variables:**
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
   - `CLERK_SECRET_KEY` - Clerk secret key (keep secret!)

3. **Clerk Configuration**
   - Add to Allowed Origins in Clerk Dashboard:
     - `https://duomigo.com`
     - `https://www.duomigo.com` (if not redirecting)
   - Set up webhooks if needed
   - Verify OAuth providers are configured

4. **Pre-deployment Checks**
   ```bash
   # Run type checking
   pnpm typecheck

   # Run linting
   pnpm lint

   # Test production build locally
   pnpm build
   pnpm start
   ```

5. **Test Critical Paths**
   - [ ] Sign up flow works
   - [ ] Sign in flow works
   - [ ] Practice sessions load and complete
   - [ ] Audio recording works
   - [ ] Feedback is displayed correctly
   - [ ] Supabase data operations work

### Deployment Process

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Release: <version>"
   git push origin main
   ```

2. **Vercel Deployment**
   - Auto-deploys on push to main branch
   - Or manually trigger: Vercel Dashboard → Deployments → Redeploy

3. **Post-deployment Verification**
   - [ ] Visit https://duomigo.com
   - [ ] Check browser console for errors
   - [ ] Test authentication flows
   - [ ] Verify SSL certificate is valid
   - [ ] Check that www redirects to apex domain

### Troubleshooting

**Build Fails on Vercel:**
1. Check build logs in Vercel Dashboard
2. Verify all env vars are set in Vercel
3. Run `pnpm tsx scripts/ci-verify-env.ts` locally
4. Check Node version matches `.nvmrc`

**TypeScript Errors:**
- For type issues with Supabase, regenerate types:
  ```bash
  pnpm supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
  ```

**Environment Variable Issues:**
- Production builds fail on missing env vars
- Preview builds only warn (won't fail)
- Use Vercel CLI to debug: `vercel env pull`

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utilities and configs
│   ├── env.ts       # Client env vars
│   ├── env.server.ts # Server env vars
│   └── supabase/    # Supabase clients
├── hooks/           # Custom React hooks
└── types/           # TypeScript types

scripts/
├── ci-verify-env.ts # Environment checker
└── seed-questions.ts # Database seeder
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript compiler
- `pnpm test` - Run Playwright tests

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs)

## Deploy on Vercel

The easiest way to deploy is via [Vercel](https://vercel.com):

1. Import your GitHub repository
2. Set environment variables
3. Deploy!

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.