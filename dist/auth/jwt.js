"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = verifyAccessToken;
exports.buildPrincipal = buildPrincipal;
const jose_1 = require("jose");
const jwksCache = new Map();
function getJWKS(issuer) {
    let jwks = jwksCache.get(issuer);
    if (!jwks) {
        jwks = (0, jose_1.createRemoteJWKSet)(new URL(`${issuer}/protocol/openid-connect/certs`));
        jwksCache.set(issuer, jwks);
    }
    return jwks;
}
async function verifyAccessToken(token, { issuer, audience, clockToleranceSec = 5 }) {
    const { payload } = await (0, jose_1.jwtVerify)(token, getJWKS(issuer), {
        issuer,
        audience,
        clockTolerance: clockToleranceSec,
    });
    return payload;
}
function buildPrincipal(p) {
    var _a, _b, _c, _d;
    const realmRoles = (_b = (_a = p.realm_access) === null || _a === void 0 ? void 0 : _a.roles) !== null && _b !== void 0 ? _b : [];
    const clientRoles = Object.entries((_c = p.resource_access) !== null && _c !== void 0 ? _c : {}).flatMap(([client, data]) => { var _a; return ((_a = data === null || data === void 0 ? void 0 : data.roles) !== null && _a !== void 0 ? _a : []).map((r) => `${client}:${r}`); });
    return {
        sub: p.sub,
        email: (_d = p.email) !== null && _d !== void 0 ? _d : p.preferred_username,
        realmRoles,
        clientRoles,
        roles: [...realmRoles, ...clientRoles],
        raw: p,
    };
}
