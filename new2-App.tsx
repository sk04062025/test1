// packages/app/src/App.tsx

import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import { apis } from './apis';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay } from '@backstage/core-components';
import { Root } from './components/Root';

// Import all your page and plugin components
import {
  CatalogEntityPage,
  CatalogIndexPage,
} from '@backstage/plugin-catalog';
// ... etc

const app = createApp({
  apis,
  // No complex component overrides are needed here
});

const routes = (
  <FlatRoutes>
    {/* Redirect the root to the catalog page */}
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
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
