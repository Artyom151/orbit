'use client';

import { FirebaseProvider } from './provider';
import { app, auth, db } from './config';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider value={{ app, auth, db }}>
      {children}
    </FirebaseProvider>
  );
}
