// packages/app/src/App.tsx

import React, { PropsWithChildren, useState, useEffect } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { apis } from './apis';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, SignInPage, Progress } from '@backstage/core-components';
import { useApi, identityApiRef, IdentityApi } from '@backstage/core-plugin-api'; // <-- IdentityApi is imported for the type
import { Root } from './components/Root';

// Import all your other page and plugin components here
import {
  CatalogEntityPage,
  CatalogIndexPage,
} from '@backstage/plugin-catalog';
// ... etc.

/**
 * This component is a wrapper that correctly performs an asynchronous check
 * to see if a user is signed in.
 */
const RequireSignIn = ({ children }: PropsWithChildren<{}>) => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'signedIn' | 'signedOut'>('loading');
  const identityApi = useApi(identityApiRef);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        await identityApi.getBackstageIdentity();
        setAuthStatus('signedIn');
      } catch (error) {
        setAuthStatus('signedOut');
      }
    };

    checkLoginStatus();
  }, [identityApi]);

  if (authStatus === 'loading') {
    return <Progress />;
  }

  if (authStatus === 'signedOut') {
    // --- THIS IS THE CORRECTED LINE ---
    // We provide the required 'onSignInSuccess' prop.
    // When the user signs in, this function is called, which updates
    // our state and causes the component to re-render.
    return (
      <SignInPage
        onSignInSuccess={() => {
          setAuthStatus('signedIn');
        }}
      />
    );
  }

  return <>{children}</>; // Render the app if logged in
};

const app = createApp({
  apis,
});

const routes = (
  <FlatRoutes>
    <Route path="/" element={<Navigate to="/catalog" />} />
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {/* ... entityPage content */}
    </Route>
    {/* ... all your other routes */}
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <AppRouter>
      <RequireSignIn>
        <Root>{routes}</Root>
      </RequireSignIn>
    </AppRouter>
  </>,
);
