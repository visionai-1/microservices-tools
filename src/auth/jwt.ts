import { createRemoteJWKSet, jwtVerify } from 'jose';

export type KeycloakTokenPayload = {
  iss: string; sub: string; aud?: string | string[]; exp: number; iat: number; azp?: string;
  email?: string; preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  permissions?: string[];
  [k: string]: any;
};

export type VerifyOpts = { issuer: string; audience?: string; clockToleranceSec?: number };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(issuer: string) {
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    jwksCache.set(issuer, jwks);
  }
  return jwks;
}

export async function verifyAccessToken(token: string, { issuer, audience, clockToleranceSec = 5 }: VerifyOpts) {
  const { payload } = await jwtVerify(token, getJWKS(issuer), {
    issuer,
    audience,
    clockTolerance: clockToleranceSec,
  });
  return payload as KeycloakTokenPayload;
}

export function buildPrincipal(p: KeycloakTokenPayload) {
  const realmRoles = p.realm_access?.roles ?? [];
  const clientRoles = Object.entries(p.resource_access ?? {}).flatMap(
    ([client, data]) => (data?.roles ?? []).map((r) => `${client}:${r}`)
  );
  return {
    sub: p.sub,
    email: p.email ?? p.preferred_username,
    realmRoles,
    clientRoles,
    roles: [...realmRoles, ...clientRoles],
    raw: p,
  };
}


