# Keycloak Authentication Module

This module provides Keycloak authentication integration for Node.js applications, including support for social authentication providers (Google, Facebook, Twitter) through Keycloak's identity brokering features.

## Features

- Singleton KeycloakService for managing Keycloak authentication
- JWT token verification
- Role and permission checking
- Express middleware for protecting routes
- Support for social authentication providers

## Installation

```bash
npm install keycloak-connect jsonwebtoken express
```

## Usage

### Initialize KeycloakService

```typescript
import { KeycloakService, KeycloakConfig } from './keycloak';

const config: KeycloakConfig = {
  realm: 'your-realm',
  'auth-server-url': 'https://your-keycloak-server/auth',
  'ssl-required': 'external',
  resource: 'your-client-id',
  'public-client': true
};

// Initialize the service
KeycloakService.getInstance(config);
```

### Protect Routes with Middleware

```typescript
import { authMiddleware } from './keycloak';
import express from 'express';

const app = express();

// Protect a route without role requirements
app.get('/api/protected', authMiddleware(), (req, res) => {
  res.json({ message: 'Protected route', user: req.user });
});

// Protect a route with role requirements
app.get('/api/admin', authMiddleware(['admin']), (req, res) => {
  res.json({ message: 'Admin route', user: req.user });
});
```

## Social Authentication

This module supports social authentication providers (Google, Facebook, Twitter) through Keycloak's identity brokering features. To enable social authentication:

1. Log in to your Keycloak admin console
2. Navigate to your realm
3. Go to Identity Providers
4. Add the desired social provider (Google, Facebook, or Twitter)
5. Configure the provider with your OAuth credentials
6. Enable the provider

The backend code and middleware do not need to change, as the authentication and user federation are handled by Keycloak. The JWT token received by your application will be valid regardless of which social provider was used to authenticate.

### Required Provider Configuration

#### Google
- Client ID
- Client Secret
- Redirect URI (configured in Google Cloud Console)

#### Facebook
- Client ID
- Client Secret
- Redirect URI (configured in Facebook Developers Console)

#### Twitter
- Client ID
- Client Secret
- Redirect URI (configured in Twitter Developer Portal)

## Error Handling

The middleware handles the following error cases:
- 401: No token provided or invalid token
- 403: Insufficient permissions (missing required roles)
- 500: Internal server error

## Types

The module exports the following TypeScript interfaces:

- `KeycloakConfig`: Configuration for Keycloak service
- `UserInfo`: User information extracted from JWT token 