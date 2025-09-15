'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#fff',
          border: '1px solid #e4e4e7',
          color: '#18181b',
        },
        className: 'font-sans',
      }}
      richColors
      closeButton
    />
  );
}