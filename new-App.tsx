// packages/app/src/App.tsx

import React, { PropsWithChildren } from 'react';
import { Route } from 'react-router';
import { apis } from './apis';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, SignInPage, Progress } from '@backstage/core-components';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { Homepage } from './components/home/Homepage';
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
    // Still loading, show a progress bar
    return <Progress />;
  }

  if (status === 'SIGNED_OUT') {
    // The user is not signed in, render the SignInPage.
    // It will automatically discover your configured OIDC provider.
    return <SignInPage />;
  }

  // The user is signed in, render the actual application.
  return <>{children}</>;
};

const app = createApp({
  apis,
  // Note: There is no 'components' override needed here.
});

// Define all your application routes here
const routes = (
  <FlatRoutes>
    <Route path="/" element={<Homepage />} />
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
      {/* The Root component containing your routes is wrapped by RequireSignIn */}
      <RequireSignIn>
        <Root>{routes}</Root>
      </RequireSignIn>
    </AppRouter>
  </>,
);
