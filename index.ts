// packages/backend/src/index.ts

import { createBackend } from '@backstage/backend-defaults';
import { createRouter } from '@backstage/plugin-auth-backend';
import {
  authModuleOidcProvider,
  providers,
} from '@backstage/plugin-auth-backend-module-oidc-provider';
// ... other imports

const backend = createBackend();

// ... other plugin initializations like scaffolder, techdocs, etc.
backend.add(import('@backstage/plugin-techdocs-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
// etc...

// --- THIS IS THE NEW SECTION TO ADD ---

// 1. Create the Auth Router
backend.add(
  // The auth backend plugin
  import('@backstage/plugin-auth-backend').then(({ default: auth }) =>
    auth.createRouter({
      // Your environment will be passed in automatically by createBackend()
      // so you don't need to specify it manually.
      providerFactories: {
        // Configure the OIDC provider
        oidc: authModuleOidcProvider.create({
          signIn: {
            // This resolver maps the Keycloak user to a Backstage user identity.
            // It uses the 'sub' claim from the token by default, which is robust.
            resolver: providers.oidc.resolvers.userEntityNameFromClaim(),
          },
        }),
        // You might have other providers here like github, gitlab, etc.
      },
    }),
  ),
);

// --- END OF NEW SECTION ---


backend.start();
