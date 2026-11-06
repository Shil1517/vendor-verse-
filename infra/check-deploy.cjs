// Checks that deployed web and mobile can reach the deployed backend.
// Usage: node infra/check-deploy.cjs <api base> <site origin> [<site origin> ...]
// e.g.   node infra/check-deploy.cjs https://vendor-verse-api.onrender.com https://vendor-verse-hlba.onrender.com https://vendor-verse-web.onrender.com
// Checks: backend health, then for each site: the browser CORS preflight for the OTP call, and that the
// site's built JavaScript contains the API URL (otherwise it is running on the in-memory mock).
const [api, ...sites] = process.argv.slice(2).map((v) => v.replace(/\/+$/, ""));
if (!api || sites.length === 0) {
  console.error("Usage: node infra/check-deploy.cjs <api base> <site origin> [...]");
  process.exit(2);
}
let failed = false;
const report = (ok, text) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${text}`);
  if (!ok) failed = true;
};
const get = (url, init) => fetch(url, { signal: AbortSignal.timeout(90000), ...init });

(async () => {
  try {
    const health = await get(`${api}/v1/health/live`);
    report(health.ok, `backend health ${api}/v1/health/live -> ${health.status}`);
  } catch (e) {
    report(false, `backend unreachable (${e.message}); a sleeping free instance can need a retry`);
  }
  for (const site of sites) {
    try {
      const pre = await get(`${api}/v1/auth/otp/request`, {
        method: "OPTIONS",
        headers: { Origin: site, "Access-Control-Request-Method": "POST" },
      });
      const allowed = pre.headers.get("access-control-allow-origin");
      report(allowed === site, `CORS ${site} -> ${allowed ?? "NOT ALLOWED (add it to CORS_ORIGINS, no trailing slash)"}`);
    } catch (e) {
      report(false, `CORS ${site}: ${e.message}`);
    }
    try {
      const html = await (await get(site)).text();
      const scripts = [...html.matchAll(/src="([^"]*\.js)"/g)].map((m) => new URL(m[1], site + "/").href);
      let found = false;
      for (const src of scripts) if ((await (await get(src)).text()).includes(`${api}/v1`)) found = true;
      report(found, `${site} bundle ${found ? "contains" : "does NOT contain"} ${api}/v1${found ? "" : " (VITE_API_BASE_URL missing at build; rebuild)"}`);
    } catch (e) {
      report(false, `${site} bundle: ${e.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
