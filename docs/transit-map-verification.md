# Transit maps and information-page regression checks

`TransitMap` reuses the Kakao Maps SDK loaded by `pages/_app.jsx`. The SDK is loaded for bus and traffic routes as well as the existing map routes. Existing public map-key configuration and domain registration apply; no new server credential is required.

If the SDK responds with HTTP 401 and `domain mismatched`, ask the owner to add the exact production origin to the existing Kakao application's web-domain settings. Do not replace keys or try to bypass domain checks. On 2026-10-21 this check passed for Daejeon and identified `https://www.letsgojeju.com` as unregistered. The map fallback and text data remain available until the owner registers it.

## Data boundaries

- Daejeon traffic uses Kakao's traffic overlay. The Daejeon public API supplies the separate road statistics; its response has node identifiers but not road geometry. Do not describe the overlay as a visualization of those public-API statistics.
- Daejeon bus route pages use stored public-API stop coordinates and `/api/bus-live` vehicle coordinates, refreshed every 20 seconds while visible. Markers update without resetting the map viewport. Invalid coordinates are omitted. On refresh failure the last list remains visible, but old vehicle markers are removed.
- The bus search page maps ODsay stop coordinates. Its route-detail link opens the matching locally indexed route's live vehicle map.
- Jeju traffic adds public-API VVMS points and available road-event coordinates to Kakao's traffic overlay. Existing table selection limits still apply. Do not infer coordinates for closures or works from names alone.
- Stop locations are not a surveyed road path. Route maps (`line` prop) join stops in order with straight segments as an approximate route; do not describe them as the road path.
- Map loading failure leaves text tables, stop lists and live arrival information available. Status colors are accompanied by text labels.

## Regression checks

Use system Chrome if Playwright's bundled browser is unavailable:

```sh
export PLAYWRIGHT_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
node scripts/testTransitContrast.mjs daejeon http://localhost:3131
node scripts/testTransitMapBrowser.mjs http://localhost:3131
node scripts/testTransitMapLive.mjs daejeon https://www.letsgodaejeon.kr
node scripts/testTravelInfoBrowser.mjs daejeon https://www.letsgodaejeon.kr
```

- `testTransitContrast` substitutes realistic long Korean/English parking names at the API boundary, checks wrapping and foreground/background contrast at 360/1280px in both themes, and checks traffic tables when enabled. Repeat for all four city builds.
- `testTransitMapBrowser` uses an SDK/API mock to verify selection, traffic toggling, polling, marker cleanup, preservation of the viewport, and the SDK-failure fallback. This is not proof that production map tiles work.
- `testTransitMapLive` requires actual production SDK initialization and downloaded tiles, then checks marker selection, toggling, dark mode and viewport overflow at 390/1280px. Run for Daejeon and Jeju after deployment. Localhost may not be an allowed Kakao domain.
- `testTravelInfoBrowser` covers city navigation, detail pages and independent mobile table scrolling. An HTTP 200 or a dark page background alone does not prove legibility.

`MyTripPage.css` must keep planner parking selectors under `.parking-list`; bare `.parking-header` or `.parking-info` selectors there collide with the main parking grid. Shared information surfaces and their dark-mode colors live in `src/styles/travelInfo.css`.

Jeju production functions must retain the existing Seoul (`icn1`) region setting. Its ITS data can fail from overseas build workers. A local build timeout is not a successful build; verify the cloud build and runtime data independently.
