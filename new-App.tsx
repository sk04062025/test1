// packages/app/src/App.tsx

// --- 1. Add useState and useEffect to the React import ---
import React, { PropsWithChildren, useState, useEffect } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { apis } from './apis';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, SignInPage, Progress } from '@backstage/core-components';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
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
    // This function will be called once when the component mounts
    const checkLoginStatus = async () => {
      try {
        // getBackstageIdentity() is an async method that resolves if the user
        // is logged in, and rejects if they are not.
        await identityApi.getBackstageIdentity();
        setAuthStatus('signedIn');
      } catch (error) {
        setAuthStatus('signedOut');
      }
    };

    checkLoginStatus();
  }, [identityApi]); // The effect depends on the identityApi

  if (authStatus === 'loading') {
    return <Progress />; // Show a loading indicator while we check
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
