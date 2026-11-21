'use client';

import { useEffect, useState } from 'react';

interface LogoLoadingProps {
  message?: string;
  compact?: boolean;
}

export function LogoLoading({ message, compact = false }: LogoLoadingProps) {
  return (
    <div className={compact ? 'logo-loader logo-loader-compact' : 'logo-loader'} role="status" aria-live="polite">
      <div className="logo-loader-mark">
        <img
          src="/images/cultural-marketplace-logo.png"
          alt=""
          className="logo-loader-image"
        />
      </div>
      <div className="logo-loader-track" aria-hidden="true">
        <span />
      </div>
      {message && (
        <p className={compact ? 'text-xs font-medium' : 'text-sm font-semibold text-white'}>
          {message}
        </p>
      )}
    </div>
  );
}

export function LogoLoadingOverlay({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message]);

  if (dismissed) return null;

  return (
    <div
      className="logo-loader-backdrop fixed inset-0 z-[200] flex cursor-pointer items-center justify-center p-4"
      title="Click anywhere to dismiss this loading effect"
      onClick={() => setDismissed(true)}
    >
      <div className="logo-loader-panel flex min-w-64 flex-col items-center px-8 py-7">
        <LogoLoading message={message} />
      </div>
    </div>
  );
}
