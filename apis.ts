// packages/app/src/apis.ts

import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
} from '@backstage/integration-api';
import {
  // Common core API refs
  configApiRef,
  discoveryApiRef,
  identityApiRef,
  createApiFactory,
  // Add oauth2ApiRef here for OIDC
  oauth2ApiRef, // This is the generic OAuth2 API reference
} from '@backstage/core-plugin-api';

import {
  // Use the generic OAuth2 implementation for OIDC
  OAuth2,
} from '@backstage/core-app-api'; // The implementation for OIDC-based auth

// ... other imports

export const apis = [
  // Existing API factories (e.g., ScmIntegrationsApi)
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),

  // Add the OIDC (Keycloak) authentication API factory
  createApiFactory({
    api: oauth2ApiRef, // Use the generic OAuth2 API reference
    deps: {
      discoveryApi: discoveryApiRef,
      configApi: configApiRef,
      identityApi: identityApiRef,
    },
    factory: ({ discoveryApi, configApi, identityApi }) =>
      OAuth2.create({
        discoveryApi,
        identityApi,
        provider: {
          id: 'oidc', // THIS MUST MATCH THE 'id' IN app-config.yaml and App.tsx SignInPage config
          title: 'Keycloak',
          icon: /* Optional: import and use your Keycloak icon here */ undefined,
        },
        defaultScopes: ['openid', 'profile', 'email'], // Request these scopes from Keycloak
      }),
  }),

  // ... other API factories you may have
];
