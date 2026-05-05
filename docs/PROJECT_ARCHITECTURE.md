# Project Architecture

This document describes the Wolo Code web app runtime architecture and the main source locations that own each layer.

## Overview

Wolo Code is a Firebase-hosted PHP/JavaScript web app for encoding and decoding exact city-based locations into three-word codes. The browser app renders the main location workflows, talks directly to Firebase Realtime Database for most app data, and calls Firebase/Google Cloud Functions for server-side tasks such as IP city lookup and city creation.

## Runtime Boundaries

| Layer | Platform | Main source locations | Notes |
| --- | --- | --- | --- |
| Browser app | Firebase Hosting | `root/HTML`, `root/CSS`, `root/JS`, `root/Resource` | PHP templates assemble static HTML/CSS/JS for hosting. |
| API/functions | Google Cloud Functions for Firebase | `functions/index.js`, `functions/*.js` | Exposes HTTPS functions and a Realtime Database trigger. |
| Database | Firebase Realtime Database | Client: `root/JS/Firebase.js`; functions: `functions/city.js` | Stores cities, city centers, city requests, and user saved addresses. |
| Hosting | Firebase Hosting | Generated output in `public/` | `public/` is build output and should not be edited for source changes. |
| CI/CD | GitHub Actions | `.github/` | The build/deploy pipeline is expected to run in GitHub Actions. This checkout currently contains Dependabot config but no committed workflow file. |

## Source Layout

| Path | Role |
| --- | --- |
| `root/HTML/Component/Root/Index.php` | Main app page composition and overlay fragments. |
| `root/HTML/Fragment` | Dialogs and shared HTML fragments, including city selection, QR, account, and browser support prompts. |
| `root/JS/Component/Root` | Root app behavior for map, decode, account, QR, city, and browser support flows. |
| `root/JS/Firebase.js` | Firebase client initialization, database references, GeoFire setup, and IndexedDB recovery handling. |
| `root/Framework` | PHP framework helpers that assemble component HTML, CSS, and JavaScript. |
| `functions` | Node 16 Cloud Functions project. |
| `database` | Seed/reference JSON data such as city list, rules, and word list. |
| `docs` | Human-maintained app documentation. |
| `public`, `interim` | Generated build output; do not edit these for source changes. |

## Browser App

The app page is assembled from `root/HTML/Component/Root/Index.php`. It includes the map canvas, Wolo Code input view, overlay dialogs, Firebase scripts, Firebase Auth UI, and QR/export dependencies.

JavaScript is assembled by `root/Framework/JS/Component.php`, which embeds framework JS, app JS, component JS, the `umb-wrapper` browser warning code, and inline SVG resources. Core view and workflow naming is documented in `APP_SECTIONS.md` and `APP_FEATURES.md`.

The client initializes Firebase with values emitted by `root/Framework/JS/Fragment/Firebase_inits.php`. `FUNCTIONS_BASE_URL` is set to `https://<site_name>/api`, so hosted API routes are expected to map `/api/*` to Firebase Functions.

## Cloud Functions

`functions/index.js` exports the backend entry points:

| Export | Type | Implementation | Purpose |
| --- | --- | --- | --- |
| `encode` | HTTPS | `functions/encode.js` | Server-side Wolo Code encoding support. |
| `decode` | HTTPS | `functions/decode.js` | Server-side Wolo Code decoding support. |
| `cityByIp` | HTTPS | `functions/geoIp.js` | Resolves the requester IP to a city/country result. |
| `add_city` | HTTPS | `functions/city.js` | Adds a city using Google Maps place details. |
| `emailOnCitySubmit` | Realtime Database trigger | `functions/city.js` | Sends an email when a new `/CityRequest/{pushId}` entry is created. |

The functions project uses Node 16 and depends on `firebase-functions`, `firebase-admin`, `@maxmind/geoip2-node`, `@google/maps`, `geofire`, and `mailgun-js`.

## IP City Flow

IP city resolution is hosted in Google Cloud Functions through the Firebase Functions export `cityByIp`.

1. The browser calls `getCityByIp()` in `root/JS/Component/Root/LocateByIp.js`.
2. The request is sent to `FUNCTIONS_BASE_URL + '/cityByIp'` with a `version: 1` header.
3. `functions/geoIp.js` reads the forwarded IP, calls MaxMind GeoLite through `@maxmind/geoip2-node`, and returns `{ city, country }`.
4. The browser normalizes the city name, stores `geoIp_city_name` and `geoIp_country_code`, updates the Wolo Code Input View city hint, and continues pending decode work when needed.
5. Empty, malformed, or unusable responses are retried briefly before the pending IP-city decode fails with a notification.

## Database

Firebase Realtime Database is the primary data store.

| Data path | Writers/readers | Purpose |
| --- | --- | --- |
| `/CityCenter` | Client `GeoFire`, functions `submit_city()` | GeoFire index for city center coordinates. |
| `/CityDetail` | Client city lookup, console tools, `add_city` function | City metadata, name IDs, administrative grouping, country, and Google place ID. |
| `/CityRequest` | Browser app and console, `emailOnCitySubmit` trigger | User/admin workflow for unsupported or requested cities. |
| `/UserData/{uid}` | Account flow in `root/JS/Component/Root/Account.js` | Signed-in user's saved Wolo Code addresses. |

Firebase Auth is used for account identity. The browser initializes Auth when available and the account dialog loads/saves address book entries under the signed-in user's UID.

## Hosting And Build

Firebase Hosting serves the generated app from `public/`. The source of truth remains under `root/`, `functions/`, `config/`, and `docs/`.

The README records the production hosting deploy command:

```powershell
firebase.cmd deploy --only hosting -P prod
```

The app also has source config under `config/URL.tsv` and `config/Script.lsv`, where the root and console components are routed into generated hosting output.

For CI/CD, the project build and deploy are intended to run in GitHub Actions. The current checkout has `.github/dependabot.yml` but no `.github/workflows` file, so the exact workflow definition is not present in this repo snapshot.

## Browser Warning Prompt

The unsupported-browser warning uses the `update-my-browser` project through the `umb-wrapper` Git submodule:

| Piece | Source |
| --- | --- |
| Submodule URL | `.gitmodules` -> `https://github.com/ujLion/umb-wrapper` |
| Upstream browser data/code | `root/Modules/umb-wrapper/update-my-browser` |
| PHP wrapper include | `root/Modules/umb-wrapper/Script.php` |
| App support check | `root/JS/Component/Root/Base/Script.js` |
| App dialog code | `root/JS/Incompatible_browser.js` |
| App dialog markup | `root/HTML/Fragment/Incompatible_browser.html` |

`syncCheckIncompatibleBrowserMessage()` checks `UMB.getStatus()`. When the status is `unsupported`, it shows the `Unsupported Browser` dialog and lets the user continue. Updating the warning logic or browser support data should happen through the `umb-wrapper`/`update-my-browser` source, then the app wrapper and prompt should be verified in the generated root bundle.

## Configuration And Secrets

Client-visible Firebase and Google API config is emitted from `root/Config/Vars_*.tsv` through `Firebase_inits.php`. Function-only credentials are read from Firebase Functions runtime config:

| Runtime config | Used by |
| --- | --- |
| `maxmind.user_id`, `maxmind.api_key` | `functions/geoIp.js` |
| `mailgun.api_key` | `functions/city.js` |
| `google_maps.api_key` | `functions/city.js` |
| `app.subdomain` | `functions/city.js` email link generation |

Service account JSON files under `manage/` are local admin tooling credentials and should not be treated as browser app assets.

## Operational Notes

- Keep source edits out of `public/` and `interim/`; regenerate them before deployment.
- Keep `APP_FEATURES.md` and `APP_SECTIONS.md` current when app behavior, UI, or user-facing flows change.
- City lookup behavior depends on Realtime Database indexes for paths such as `CityDetail.name_id`.
- IP city lookup is intentionally coarse and should remain a hint; browser geolocation is only requested from explicit user action.
