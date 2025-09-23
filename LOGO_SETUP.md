# How to Change Your App Logo/Favicon

## Required Files and Dimensions

Place your logo files in the `/src/app/` directory with these exact names:

### 1. **favicon.ico** (Browser tab icon)
- Dimensions: 16x16 and 32x32 (multi-resolution ICO file)
- This is the traditional favicon shown in browser tabs

### 2. **icon.png** (Modern browsers)
- Dimensions: 512x512 pixels
- Used by modern browsers and PWA installations
- Next.js will automatically generate smaller sizes (192x192, etc.)

### 3. **apple-icon.png** (Apple devices)
- Dimensions: 180x180 pixels
- Used for iOS home screen shortcuts and Safari bookmarks

## Step-by-Step Instructions

1. **Prepare your logo in PNG format** with transparent background
2. **Create the required sizes:**
   - 180x180 px for apple-icon.png
   - 512x512 px for icon.png
   - Use an online tool like favicon.io to generate favicon.ico from your PNG

3. **Place the files in `/src/app/` directory:**
   ```
   src/app/
   ├── favicon.ico     (replace existing)
   ├── icon.png        (new file)
   └── apple-icon.png  (new file)
   ```

4. **Optional: Create a web manifest** for PWA support
   Create `/src/app/manifest.json` with your app details

5. **Clear browser cache** and refresh to see changes

## Alternative: Dynamic Icon Generation

If you only have one PNG file, you can use Next.js's icon generation:

Create `/src/app/icon.tsx`:
```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        D
      </div>
    ),
    {
      ...size,
    }
  )
}
```

## Notes
- The favicon will be cached by browsers, so you may need to hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- For development, you might need to restart the Next.js dev server after adding these files
- The files must be directly in `/src/app/`, not in subdirectories