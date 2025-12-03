import { 
  ScmIntegrationsApi, 
  scmIntegrationsApiRef, 
  ScmAuth 
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  createApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi
} from '@backstage/core-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';

// 1. Define the API Reference
export const oidcAuthApiRef: ApiRef<
  OpenIdConnectApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
> = createApiRef({
  id: 'auth.oidc', // Must match the 'oidc' key in app-config.yaml
});

export const apis: AnyApiFactory[] = [
  // ... existing factories ...

  // 2. Create the API Factory
  createApiFactory({
    api: oidcAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'oidc', // Must match the 'oidc' key in app-config.yaml
          title: 'My OIDC Auth',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
        defaultScopes: ['openid', 'profile', 'email'], // Adjust scopes as needed
      }),
  }),
];
