# Wolo custom-domain setup

Use the hostname in the browser address bar when configuring browser-facing services. Apache may receive a different Host header from the proxy.

## Check Map View on lcl.wolo.codes

1. Sign in through Cloudflare Access, open Map View, and check the browser console for the first Maps JavaScript API error. If it reports `RefererNotAllowedMapError`, add `https://lcl.wolo.codes/*` to the website restrictions on the **browser** Google Maps API key used by this build. Leave the existing API restrictions in place. Maps JavaScript initializes the interaction layer even when a different tile source is selected. [Google Maps error reference](https://developers.google.com/maps/documentation/javascript/error-messages)
2. Find the active environment from the served build. The PHP template `Root/HTML/Template/Base.php` loads Maps JavaScript and Places using `google_maps_api_key` from the applicable `Root/Config/Vars*.tsv` configuration. Check that key's Google Cloud project, billing, and API enablement if the error points to any of those. The server-side key in Functions runtime configuration is separate.
3. Reload the app and verify Map View, place search, and city lookup. If Maps loads and the app still opens the crash dialog, collect its exception and inspect the first failing request. A failed city or account request can have a different cause.

## Where to enable a hostname

| Service | Configuration to check |
| --- | --- |
| DNS and ingress | For the local preview, Caddy already accepts `lcl.wolo.codes` and forwards it as `local.wolo.codes` to Apache. Check the hostname route in Cloudflare Tunnel `lcl-wolo`, the Access application and its login policy, and the origin TLS configuration. Direct loopback preview uses `wolo.local` with the local hosts entry and trusted Caddy certificate. |
| Firebase Hosting | For a hostname served by Firebase Hosting, attach it to the intended Hosting site and complete DNS verification and TLS provisioning. Check the Hosting rewrites for `/api/*`. The tunneled `lcl.wolo.codes` preview goes to Caddy. [Firebase Hosting domain setup](https://firebase.google.com/docs/hosting/custom-domain) |
| Google Maps and Places | Add the exact HTTPS hostname to the website restrictions on the browser key for the active environment. Check Maps JavaScript and the Places services enabled for that key. |
| Firebase Authentication | Add the browser hostname under Authentication → Settings → Authorized domains in the active Firebase project. If the hostname will also serve as `authDomain`, ensure it serves the Firebase Auth helper routes and register `https://<auth-domain>/__/auth/handler` with the OAuth provider where required. [Firebase Google sign-in configuration](https://firebase.google.com/docs/auth/web/google-signin#customizing-the-redirect-domain-for-google-sign-in) |
| Firebase client and Functions | `Root/Framework/JS/Fragment/Firebase_inits.php` derives both `authDomain` and the HTTPS `/api` base from `site_name`. Verify the emitted Firebase project and API URL for the target build. The current public city, IP, encode and decode handlers use wildcard CORS, so those handlers have no host list to update. Check the route, Access policy and the response in the browser. |
| Apple MapKit JS | If Apple Maps is enabled with a domain-restricted token, include the browser hostname in the Maps token configuration and update `apple_maps_token` for that environment. [Apple Maps token configuration](https://developer.apple.com/documentation/MapKitJS/creating-a-maps-token) |

Verify the origin over trusted HTTPS on the device used for preview. Check a deep link, Map View, place search, sign-in, and camera permission after adding a hostname.
