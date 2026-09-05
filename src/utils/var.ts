/**
 * Konstanta terkait sesi admin.
 *
 * `accessTokenName` HARUS sama persis dengan nama cookie yang di-set backend
 * (`accessTokenCookieName` di internal/http/handlers/auth_handler.go). Proxy
 * (src/proxy.ts) memakai nama ini untuk presence-check; kalau tidak cocok,
 * seluruh area /admin akan selalu dilempar ke halaman login.
 */
export const jwtConfig = {
  admin: {
    accessTokenName: "access_token",
  },
};
