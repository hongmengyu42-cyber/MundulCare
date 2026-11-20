'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
            }
          ) => void;
        };
      };
    };
  }
}

const DEFAULT_GOOGLE_CLIENT_ID = '1084713813406-rlqrcdcce4cm7qksqrqbbgs7pjpicv6r.apps.googleusercontent.com';

// Renders Google's own "Sign in with Google" button (Google Identity Services).
// Falls back to project default client ID if NEXT_PUBLIC_GOOGLE_CLIENT_ID is omitted in deployment.
export default function GoogleSignInButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { setAuth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  const renderButton = useCallback(() => {
    if (!clientId || !window.google?.accounts?.id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setError(null);
        try {
          const res = await authApi.googleLogin({ idToken: response.credential });
          if (res.success && res.data) {
            setAuth(res.data);
            const redirectParam = typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('redirect')
              : null;
            if (res.data.role === 'ADMIN') {
              router.push('/admin');
            } else if (res.data.role === 'DOCTOR') {
              router.push('/doctor');
            } else if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
              router.push(redirectParam);
            } else {
              router.push('/');
            }
          } else {
            setError(res.message || 'Google sign-in failed.');
          }
        } catch (err: unknown) {
          console.error('Google sign-in failed', err);
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Google sign-in failed. Please try again.';
          setError(msg);
        }
      },
    });

    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    });
  }, [clientId, router, setAuth]);

  // Ensures the button renders on initial load, client-side navigation (/login <-> /register),
  // and Next.js Fast Refresh (HMR) even if the GSI script is already loaded or still loading.
  useEffect(() => {
    if (!clientId) return;

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (window.google?.accounts?.id) {
        renderButton();
        clearInterval(interval);
      } else if (attempts >= 50) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [clientId, renderButton]);

  if (!clientId) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={renderButton}
        onReady={renderButton}
      />
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex justify-center min-h-[40px]">
        <div ref={buttonRef} />
      </div>
    </>
  );
}
