import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex-grow flex items-center justify-center">
        {children}
      </div>
      <footer className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Copyright by Ali Deden Nuryadin
        </p>
      </footer>
    </main>
  );
}
