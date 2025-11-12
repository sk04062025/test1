import { createRouter } from '@backstage/plugin-auth-backend';
import {
  providers as authProviders,
  resolvers,
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      oidc: authProviders.oidc.create({
        signIn: {
          resolver: resolvers.oidc.default
          // You might want a custom resolver here to map Keycloak roles/groups to Backstage identities
          // Check Backstage docs for advanced resolver configurations.
        }
      }),
    },
  });
}
