# Supabase Email Configuration Fix

## The Problem
When users click the magic link in their email, they get to a Supabase confirmation page but aren't redirected back to your app.

## Solution: Configure Email Templates in Supabase

### 1. Go to Supabase Dashboard
Navigate to **Authentication → Email Templates**

### 2. Update the "Magic Link" Template

Find the **Magic Link** email template and update it:

#### Default Template (problematic):
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
```

#### Updated Template (with proper redirect):
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
```

**Note:** The `{{ .ConfirmationURL }}` should automatically include your redirect URL if configured properly.

### 3. Configure Redirect URLs in Supabase

Go to **Authentication → URL Configuration** and ensure these are set:

#### Redirect URLs (Add ALL of these):
```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/**
https://*.vercel.app/auth/callback
https://*.vercel.app/**
```

### 4. Update Email Settings

In **Authentication → Settings**, ensure:

- **Enable Email Confirmations** is set appropriately (usually OFF for MVP)
- **Secure Email Change** is enabled if needed
- **Email OTP Expiry** is reasonable (default 3600 seconds)

### 5. Fix the Magic Link Flow

The issue is that Supabase needs to know where to redirect after email confirmation. Update your login component:

#### In your login request, specify the redirect:

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

This is already in your code, but make sure `window.location.origin` is correct!

### 6. Alternative: Update Supabase Email Template Directly

If the above doesn't work, you can customize the email template to force the redirect:

Go to **Authentication → Email Templates → Magic Link** and use:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Magic Link</title>
</head>
<body>
  <h2>Magic Link</h2>
  <p>Click the button below to sign in:</p>
  
  <!-- Force the redirect URL to include your app's callback -->
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
    Sign In to Duomigo
  </a>
  
  <p>Or copy and paste this link:</p>
  <p>{{ .ConfirmationURL }}</p>
  
  <p>This link will expire in 1 hour.</p>
</body>
</html>
```

### 7. Test the Fix

1. Clear your browser cookies/cache
2. Go to `/login`
3. Enter your email
4. Check email and click the magic link
5. You should be redirected to `/auth/callback` then to `/app`

## Debugging Steps

### Check the Magic Link URL
When you receive the email, hover over the link and check if it includes:
- Your domain (localhost:3000 or your-app.vercel.app)
- The path `/auth/callback`
- A `code` parameter

Example good URL:
```
http://localhost:3000/auth/callback?code=abc123...
```

### Check Browser Console
Open DevTools and look for:
- Any redirect errors
- CORS issues
- Cookie problems

### Check Vercel/Server Logs
Look for errors in:
- The `/auth/callback` route
- Session exchange errors

## Common Issues and Fixes

### Issue 1: "Invalid Authentication Code"
**Fix:** The code might be expired or already used. Request a new magic link.

### Issue 2: Stuck on Supabase's Domain
**Fix:** The redirect URL isn't configured properly. Double-check URL Configuration in Supabase.

### Issue 3: Redirects to Login Instead of App
**Fix:** The session isn't being set properly. Check that cookies are enabled and the domain matches.

## Quick Fix for Local Development

If you're testing locally and having issues:

1. **Use ngrok or similar** to get a public URL:
```bash
ngrok http 3000
```

2. **Add the ngrok URL** to Supabase redirect URLs:
```
https://your-ngrok-url.ngrok.io/auth/callback
```

3. **Update your .env.local**:
```env
NEXTAUTH_URL=https://your-ngrok-url.ngrok.io
```

## Nuclear Option: Disable Email Confirmation

For MVP testing, you can disable email confirmation entirely:

1. Go to **Authentication → Settings**
2. Set **Enable Email Confirmations** to **OFF**
3. Users will be logged in immediately after clicking the magic link

## Verify It's Working

After implementing the fix, the flow should be:

1. User enters email on `/login`
2. User receives email with magic link
3. User clicks link
4. Browser opens and goes to `/auth/callback?code=...`
5. Route exchanges code for session
6. User is redirected to `/app`
7. User sees their dashboard

If this flow works, your email authentication is properly configured! 🎉