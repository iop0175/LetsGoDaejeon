# Transit maps and information-page regression checks

`TransitMap` reuses the Kakao Maps SDK loaded by `pages/_app.jsx` for map routes, including `/spot`. Existing public map-key configuration and domain registration apply; no new server credential is required.

If the SDK responds with HTTP 401 and `domain mismatched`, ask the owner to add the exact production origin to the existing Kakao application's web-domain settings. Do not replace keys or try to bypass domain checks. On 2026-10-21 this check passed for Daejeon and identified `https://www.letsgojeju.com` as unregistered. The map fallback and text data remain available until the owner registers it.

## Where transit data lives

On 2026-10-22 the standalone `/bus` (ODsay route search), `/bus/route/*`, `/bus/stop/*` and `/traffic` pages were removed in every city at the owner's request. Their data now appears on the Korean place detail page (`pages/spot/[slug].jsx`):

- "주변 도로 상황": Kakao's live traffic overlay around the place (all cities, when the place has coordinates). It is Kakao's traffic data, not the Daejeon/Jeju public road statistics.
- "근처 버스정류장" (Daejeon only): up to 3 stops within 500 m from `src/data/daejeonBus.json`, with stop number, straight-line distance, the route numbers that serve it, and live arrivals from `/api/bus-live?stop=`, refreshed every 20 seconds while visible.
- Map loading failure leaves the stop list and live arrivals available. Status colors are accompanied by text labels.

## Regression checks

Use system Chrome if Playwright's bundled browser is unavailable:

```sh
export PLAYWRIGHT_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
node scripts/testTransitContrast.mjs daejeon http://localhost:3131
node scripts/testTravelInfoBrowser.mjs daejeon https://www.letsgodaejeon.kr
```

- `testTransitContrast` substitutes realistic long Korean/English parking names at the API boundary and checks wrapping and foreground/background contrast at 360/1280px in both themes. Repeat for all four city builds.
- `testTravelInfoBrowser` covers city navigation, detail pages and independent mobile table scrolling. An HTTP 200 or a dark page background alone does not prove legibility.

`MyTripPage.css` must keep planner parking selectors under `.parking-list`; bare `.parking-header` or `.parking-info` selectors there collide with the main parking grid. Shared information surfaces and their dark-mode colors live in `src/styles/travelInfo.css`.

Jeju production functions must retain the existing Seoul (`icn1`) region setting. Its ITS data can fail from overseas build workers. A local build timeout is not a successful build; verify the cloud build and runtime data independently.
