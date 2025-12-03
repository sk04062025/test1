// Import the API Ref you just created
import { oidcAuthApiRef } from './apis'; 

const app = createApp({
  apis,
  components: {
    SignInPage: props => (
      <SignInPage
        {...props}
        auto
        provider={{
          id: 'oidc-auth-provider',
          title: 'Sign in with OIDC',
          message: 'Sign in using your corporate ID',
          apiRef: oidcAuthApiRef, // Use the reference imported above
        }}
      />
    ),
  },
  // ...
});
