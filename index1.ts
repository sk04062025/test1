// --- AFTER ---
import { AzureDevOpsEntityProvider } from '@backstage/plugin-catalog-backend-module-azure'; // Make sure this import is at the top

backend.add(
  catalogPlugin({
    // --- Add this entire entityProviders section ---
    entityProviders: [
      {
        provider: AzureDevOpsEntityProvider.fromConfig(
          backend.getReader('config'),
          {
            logger: backend.getLogger('catalog'),
            scheduler: backend.getScheduler(),
          },
        ),
        schedule: backend.getScheduler().createScheduledTaskRunner({
           frequency: { minutes: 30 },
           timeout: { minutes: 3 },
        }),
      },
    ],
    // other options might still be here
  }),
);
