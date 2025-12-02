// packages/app/src/App.tsx

import React, { PropsWithChildren } from 'react';
// --- 1. Import Navigate ---
import { Route, Navigate } from 'react-router-dom';
import { apis } from './apis';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, SignInPage, Progress } from '@backstage/core-components';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
// --- 2. Remove the Homepage import ---
// import { Homepage } from './components/home/Homepage'; // <-- REMOVE THIS LINE
import { Root } from './components/Root';

// Import all your other page and plugin components here
import {
  CatalogEntityPage,
  CatalogIndexPage,
} from '@backstage/plugin-catalog';
import { CatalogImportPage } from '@backstage/plugin-catalog-import';
import { ScaffolderPage } from '@backstage/plugin-scaffolder';
// ... etc.

/**
 * This component is a wrapper that checks if a user is signed in.
 * If they are not, it displays the SignInPage.
 * If the status is still loading, it shows a progress indicator.
 * Otherwise, it renders its children (the main app).
 */
const RequireSignIn = ({ children }: PropsWithChildren<{}>) => {
  const identityApi = useApi(identityApiRef);
  const { status } = identityApi.getLoginStatus();

  if (status === 'PENDING') {
    return <Progress />;
  }

  if (status === 'SIGNED_OUT') {
    return <SignInPage />;
  }

  return <>{children}</>;
};

const app = createApp({
  apis,
});

// Define all your application routes here
const routes = (
  <FlatRoutes>
    {/* --- 3. Change the root route to redirect to the catalog --- */}
    <Route path="/" element={<Navigate to="/catalog" />} />
    
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {/* ... entityPage content */}
    </Route>
    <Route path="/create" element={<ScaffolderPage />} />
    <Route path="/catalog-import" element={<CatalogImportPage />} />
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
