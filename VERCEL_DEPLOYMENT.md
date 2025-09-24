# Deploy to Vercel and Connect to duomigo.com

## ✅ Pushed to GitHub
Your changes have been successfully pushed to: `https://github.com/MorteezaEhsani/duomigo-web`

## 📦 Deploy to Vercel

### Option 1: If You Already Have Vercel Account Connected

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Your project should auto-deploy from the GitHub push

### Option 2: First Time Deployment

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub (recommended)

2. **Import Your Project**
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose `duomigo-web` from your GitHub repos
   - Click "Import"

3. **Configure Environment Variables**
   Add ALL these environment variables in Vercel:
   ```
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Replicate (for TTS)
   REPLICATE_API_TOKEN=your_replicate_token
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)

## 🌐 Connect duomigo.com Domain

### In Vercel:

1. **Go to Project Settings**
   - Navigate to your project in Vercel
   - Click "Settings" → "Domains"

2. **Add Your Domain**
   - Click "Add"
   - Enter `duomigo.com`
   - Also add `www.duomigo.com`

3. **Configure DNS**
   Vercel will show you DNS records to add. You'll need:

   **For apex domain (duomigo.com):**
   - Type: A
   - Name: @
   - Value: 76.76.21.21

   **For www subdomain:**
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

### In Your Domain Provider (Namecheap, GoDaddy, etc.):

1. **Login to your domain provider**
2. **Go to DNS Management**
3. **Remove existing A/CNAME records** (if any)
4. **Add the Vercel DNS records above**
5. **Save changes**

### Verify Domain:

1. **Back in Vercel**, click "Verify"
2. **Wait for DNS propagation** (5 mins - 48 hours, usually quick)
3. **Check status** - Should show "Valid Configuration ✓"

## 🚀 Your Site is Live!

Once DNS propagates:
- ✅ Visit [duomigo.com](https://duomigo.com)
- ✅ HTTPS is automatic (SSL certificate provided by Vercel)
- ✅ Auto-deploys on every git push to main branch

## 🔧 Post-Deployment Checklist

1. **Test Authentication**
   - Sign up with a new account
   - Sign in/out works

2. **Test Database Connection**
   - Create a practice session
   - Check if streak tracking works

3. **Update Admin Email**
   - Edit `/src/app/admin/questions/page.tsx`
   - Replace `'your-email@example.com'` with your actual email
   - Push to GitHub to deploy

4. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor error logs in Vercel Functions tab

## 🆘 Troubleshooting

**Domain not working?**
- Check DNS propagation: [dnschecker.org](https://dnschecker.org)
- Ensure old DNS records are removed
- Try clearing browser cache

**Build failing?**
- Check environment variables are set correctly
- Look at build logs in Vercel dashboard
- Ensure all dependencies are in package.json

**Functions not working?**
- Verify API keys are correct
- Check Vercel Functions logs
- Ensure Supabase URLs don't have trailing slashes

## 📞 Need Help?

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Domain Setup Guide: [vercel.com/docs/projects/domains](https://vercel.com/docs/projects/domains)
- Support: Use Vercel Dashboard chat support