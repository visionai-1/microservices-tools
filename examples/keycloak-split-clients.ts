import {
  KeycloakService,
  KeycloakConnectClient,
  KeycloakAdminClient,
  initializeKeycloak,
  validateKeycloakEnv,
  getMissingKeycloakEnvVars
} from '../src/keycloak';

async function demonstrateSplitClients() {
  console.log('=== Keycloak Environment-Only Example ===\n');

  // 1. Validate environment variables first
  console.log('1. Validating required environment variables...');
  if (validateKeycloakEnv()) {
    console.log('✅ All required environment variables are set');
  } else {
    const missing = getMissingKeycloakEnvVars();
    console.log('❌ Missing required environment variables:', missing.join(', '));
    console.log('⚠️  Please set these environment variables (see examples/env.example)\n');
  }

  // 2. Use the main service for authentication
  console.log('2. Using main service for authentication...');
  try {
    const keycloakService = initializeKeycloak(); // Always uses env vars only
    console.log('✅ KeycloakService initialized from environment variables\n');
    const token = 'your-jwt-token-here';
    const userInfo = await keycloakService.verifyToken(token);
    console.log('✅ User authenticated:', userInfo.sub);

    const hasRoles = keycloakService.hasRequiredRoles(userInfo, ['user', 'admin']);
    console.log('✅ Role check result:', hasRoles);
  } catch (error) {
    console.log('❌ Authentication failed (expected for demo):', error instanceof Error ? error.message : 'Unknown error');
  }
  console.log();

  // 3. Use the main service for admin operations
  console.log('3. Using main service for admin operations...');
  try {
    const keycloakService = KeycloakService.getInstance();
    if (keycloakService.isAdminEnabled()) {
      try {
        const adminToken = await keycloakService.getAdminToken();
        console.log('✅ Admin token retrieved');

        const users = await keycloakService.getUsers({ max: 5 });
        console.log('✅ Retrieved users count:', users.length);
      } catch (error) {
        console.log('❌ Admin operation failed (expected for demo):', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      console.log('⚠️  Admin functionality not available (no admin credentials in env vars)');
    }
  } catch (error) {
    console.log('❌ Service not available:', error instanceof Error ? error.message : 'Unknown error');
  }
  console.log();

  // 4. Access individual clients directly
  console.log('4. Accessing individual clients...');
  try {
    const keycloakService = KeycloakService.getInstance();

    // Get connect client
    const connectClient = keycloakService.getConnectClient();
    console.log('✅ Connect client accessed');

    // Get admin client
    const adminClient = keycloakService.getAdminClient();
    if (adminClient) {
      console.log('✅ Admin client accessed');
    } else {
      console.log('⚠️  Admin client not available');
    }
  } catch (error) {
    console.log('❌ Failed to access clients:', error instanceof Error ? error.message : 'Unknown error');
  }
  console.log();

  // 5. Use individual clients with their own environment variables
  console.log('5. Using individual clients with independent environment variables...');

  // Connect client reads its own env vars (KEYCLOAK_REALM, KEYCLOAK_AUTH_SERVER_URL, etc.)
  try {
    const connectClientEnv = KeycloakConnectClient.getInstance();
    console.log('✅ Connect client initialized from environment variables');

    // Test with demo token
    try {
      await connectClientEnv.verifyToken('demo-token');
    } catch (error) {
      console.log('✅ Token verification failed as expected (demo token)');
    }
  } catch (error) {
    console.log('❌ Connect client env initialization failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Admin client reads its own env vars (KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET, etc.)
  try {
    const adminClientEnv = KeycloakAdminClient.getInstance();
    console.log('✅ Admin client initialized from environment variables');

    // Test admin token retrieval
    try {
      await adminClientEnv.getAdminToken();
      console.log('✅ Admin token retrieved from env-based client');
    } catch (error) {
      console.log('⚠️  Admin token retrieval failed (expected if no admin env vars)');
    }
  } catch (error) {
    console.log('❌ Admin client env initialization failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // 6. Environment-only approach for all clients
  console.log('\n6. Environment-only approach for all clients...');
  try {
    // Main service uses environment vars only
    const envService = KeycloakService.getInstance();
    console.log('✅ Main service uses environment variables only');

    // Individual clients use their own env vars
    const connectFromEnv = KeycloakConnectClient.getInstance();
    const adminFromEnv = KeycloakAdminClient.getInstance();

    console.log('✅ Connect client from env:', !!connectFromEnv);
    console.log('✅ Admin client from env:', !!adminFromEnv);
  } catch (error) {
    console.log('❌ Environment-only approach failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n=== Example completed ===');
  console.log('\nEnvironment Variables Used (all clients read from environment only):');
  console.log('Required:');
  console.log('- KEYCLOAK_REALM');
  console.log('- KEYCLOAK_AUTH_SERVER_URL');
  console.log('- KEYCLOAK_RESOURCE');
  console.log('\nOptional:');
  console.log('- KEYCLOAK_SSL_REQUIRED (defaults to "external")');
  console.log('- KEYCLOAK_PUBLIC_CLIENT (defaults to "false")');
  console.log('- KEYCLOAK_CONFIDENTIAL_PORT (defaults to "0")');
  console.log('- KEYCLOAK_BEARER_ONLY (defaults to "false")');
  console.log('- KEYCLOAK_ADMIN_CLIENT_ID (for admin functionality)');
  console.log('- KEYCLOAK_ADMIN_CLIENT_SECRET (for admin functionality)');
  console.log('\nTo run this example:');
  console.log('1. Copy examples/env.example to .env');
  console.log('2. Update the values in .env with your Keycloak configuration');
  console.log('3. Load the environment variables in your app (e.g., with dotenv)');
  console.log('4. Call initializeKeycloak() with no parameters - it will read from environment automatically');
}

// Run the example
demonstrateSplitClients().catch(console.error); 