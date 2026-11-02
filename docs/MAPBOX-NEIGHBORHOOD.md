# Optional Mapbox neighborhood enhancement

Implementation is staged without an account/token. No Mapbox map is claimed live until an approved public token is configured and provider/browser QA passes. Current raster fallback remains usable without WebGL. No booking behavior changes.

## Owner decisions / activation
- Approve a Mapbox account and its usage-based billing before connecting it. Each GL JS Map initialization is a billable map load subject to that account's current allowance/rates; loading is delayed until the map enters the viewport. No paid service or account was created by this change.
- Preferred production setup: create a dedicated public `pk.` token, only necessary public map read scopes, URL restricted to `https://innkipper.com` and explicitly approved preview origins. The separately inspected no-card Demo account instead has one default public token with no URL restrictions and a 5,000-map-load period quota; that limited, unrestricted demo connection requires explicit owner approval and is not equivalent to a restricted production token. Do not substitute standard-account free-tier figures or silently upgrade billing. Quota/API errors return to the raster fallback. Public browser tokens are visible; restrictions are best-effort abuse mitigation, not secrecy. Never use an `sk.` secret token or commit any real token.
- Only with explicit credential configuration approval, set `NEXT_PUBLIC_MAPBOX_TOKEN` in the hosting build environment and rebuild. A NEXT_PUBLIC variable is embedded in the public client bundle. No existing environment values were read or changed.
- Retain built-in Mapbox logo and text attribution. The Casa logo is a neighborhood overlay, never a replacement for required attribution.

## Behavior / privacy
Pinned GL JS 3.34.1 (official October 29 release), lazy ESM import. Standard style uses warm ivory land, sage water/greenspace, quiet forest labels, hidden POI/transit/3D objects. Fixed broad Mira Mesa center/area only, no property coordinates/address/visitor location/query inputs. Local Casa marker labels the approximate neighborhood, not a home position.

Viewport-only SDK import; public token validation; supported-WebGL check before map construction; 12-second initialization timeout; runtime network/context failure and unmount remove the map. Existing raster fallback stays beneath it. Inaccessible pending map is inert; default navigation controls and cooperative gestures preserve keyboard interaction and normal one-finger page scrolling. Reduced motion respected; no fly-to animation. No service-worker/provider tile offline caching, proxying or prefetching was added. Mapbox's normal SDK network/usage reporting is not blocked or modified; account/privacy disclosure review is required before activation. When a public token is configured, the map caption discloses Mapbox browser/network processing and links its privacy policy.

## Required remaining QA
With an approved restricted token: verify actual style/color/label support, attribution/logo visibility, mobile two-finger map gestures, ordinary page scroll, keyboard controls, invalid-token/network/WebGL-loss fallback, navigation/unmount and repeat visits. The credential-free tests do not establish successful provider rendering or billing configuration. Verify no token/secret appears in logs or source commits. Physical-device QA remains distinct from browser zoom.

## Official references (checked 2026-10-31)
- https://docs.mapbox.com/mapbox-gl-js/guides/ (installation / client SDK)
- https://docs.mapbox.com/map-styles/reference/standard/ (style config)
- https://docs.mapbox.com/accounts/guides/tokens/ (public scopes / restrictions)
- https://docs.mapbox.com/help/dive-deeper/how-to-use-mapbox-securely/
- https://docs.mapbox.com/mapbox-gl-js/guides/pricing/ (map-load billing)
- https://docs.mapbox.com/help/dive-deeper/attribution/
- https://docs.mapbox.com/mapbox-gl-js/example/cooperative-gestures/

Non-sensitive DOM diagnostics expose only fixed lifecycle categories (`missing-token`, `loading`, `unsupported-webgl`, `style-load-error`, `sdk-load-error`, `timeout`, `webgl-context-lost`, `ready`). Raw SDK errors, token values and provider URLs are never included. These distinguish fallback causes without browser capability-policy workarounds.
