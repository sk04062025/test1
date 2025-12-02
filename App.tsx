// packages/app/src/App.tsx

import React, { PropsWithChildren } from 'react';
import { Route } from 'react-router';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { SearchPage } from '@backstage/plugin-search';
import { TechRadarPage } from '@backstage/plugin-tech-radar';
import {
  TechDocsIndexPage,
  techdocsPlugin,
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';

import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, SignInPage } from '@backstage/core-components';
import { oidcAuthApiRef } from '@backstage/core-plugin-api'; // OIDC specific API ref
import { githubAuthApiRef } from '@backstage/core-plugin-api'; // Example of another provider
import { Homepage } from './components/home/Homepage';

// ** 1. Define the Sign-in configuration **
const app = createApp({
  apis,
  // This is where you link the sign-in page to your OIDC provider config
  components: {
    SignInPage: props => (
      <SignInPage
        {...props}
        auto
        provider={{
          id: 'oidc', // Matches your app-config.yaml provider key
          title: 'Keycloak', // Text on the button
          message: 'Sign in using Keycloak',
          apiRef: oidcAuthApiRef, // Use the generic OIDC API reference
        }}
      />
    ),
  },
});

// ** 2. Define the Routes **
const routes = (
  <FlatRoutes>
    <Route path="/" element={<Homepage />} />
    <Route path="/catalog" element={<CatalogIndexPage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route path="/docs" element={<TechDocsIndexPage />} />
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={<TechDocsReaderPage />}
    />
    <Route path="/create" element={<ScaffolderPage />} />
    <Route path="/api-docs" element={<ApiExplorerPage />} />
    <Route
      path="/tech-radar"
      element={<TechRadarPage width={1500} height={800} />}
    />
    <Route path="/catalog-import" element={<CatalogImportPage />} />
    <Route path="/search" element={<SearchPage />}>
      {searchPage}
    </Route>
    <Route path="/settings" element={<UserSettingsPage />} />
    <Route path="/org" element={orgPlugin.routes.catalogIndexPage} />
  </FlatRoutes>
);

// ** 3. Export the main App component **
export default app.createRoot(
  <>
    <AlertDisplay />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
