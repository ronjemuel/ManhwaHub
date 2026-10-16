# V1 verification report

Verified 2026-09-20 against the production static build. Tests use synthetic local reading data, original demo assets and public Kitsu metadata. No third-party chapter content was obtained.

## Automated gates

`npm run build`, `npm run typecheck`, and `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` passed. `npm test` passed all **8 tests**, with zero failures and zero skips after the build. The tests are checked into `tests/` and use Node's test runner and fake-indexeddb.

| Area | Evidence |
| --- | --- |
| Content policy | Default Mature/Explicit exclusion, blocked genres, language filtering, unknown Kitsu classification, hidden direct series URLs |
| Registry | Search, format/status/genre filters, explicit canonical mapping, disabled/no sources, independent source results |
| Provider failure | Failing adapter retains successful results and records failure; 12-second timeout aborts the request |
| Chapters | Local chapter/page retrieval, missing chapter, exact chapter equivalence, rejected ambiguous/language-mismatched mapping |
| External validation | Kitsu fixture normalization, conservative unknown ratings, plain-text descriptions, metadata-only reader capability |
| Persistence | IndexedDB library, favorite, status, settings, chapter/scroll/page-relative position, chronological history and monotonic completion |
| Backups | Export/parse/import round trip; atomic replacement; rejects unsafe URL, malformed JSON, unknown version and duplicate identifiers without altering saved data |
| Offline shell | Executes the actual generated service worker in a controlled harness: precaches emitted routes/assets, restores reader route offline, excludes demo bulk download and remote image requests, clears old shell versions |

The service-worker test skips on a clean checkout without `out/sw.js`; run `npm run build` first for all eight tests.

## Interactive production-browser checks

| Flow | Result |
| --- | --- |
| Navigation | Home, Browse, series, reader, Library, More, Sources, Settings and History opened successfully; normal navigation hidden in Reader |
| Search and filters | All-source results included demo and live Kitsu titles. Source-scoped search worked. Webtoon + Completed + Safe + English + title sort returned Cloudbound. Empty query results showed recovery controls |
| Series | Cover, metadata, chapter list, read state, continue, library and favorite controls rendered and worked |
| Source enable/disable | Alternate demo enabled; disabling the primary source blocked its direct series URL with an enable-source explanation; re-enabling restored access |
| Live provider | Kitsu public metadata and covers loaded. Explicit connection check reported “Last request succeeded.” This is an observed request, not a future availability guarantee |
| Reader | Vertical reading, paged navigation, reversed RTL controls, chapter selector, previous/next chapters and settings exercised |
| Restoration | Scrolled a vertical chapter to **750px**, reloaded, and observed restoration to **750px** and the same displayed progress. Reserved image dimensions prevented image-load jumps |
| Source switch | Switched an explicitly mapped chapter to the alternate demo edition. Backup contained both source-specific positions at the same chapter/page |
| Library | Add, Reading status, favorite, Favorites filter and refresh persistence verified |
| Continue Reading | Saved positions appeared on Home and series; resume links retained source and chapter identity |
| History | Chronological source-specific entries, continue links, individual deletion and confirmed clear worked; saved progress is kept separately |
| Content | Default Browse rating options were Safe/Suggestive only. Direct Explicit fixture link was blocked. Policy also has automated coverage |
| Export | Downloaded actual JSON; parsed it and verified library/favorite/settings/history/progress records, including both source positions |
| Import | Imported the exported file through the file picker and confirmed replacement; “Backup restored” appeared. Invalid backup produced an explanatory error without replacement |
| Broken image | Temporarily removed one built demo asset: reader displayed “This page didn’t load” with Retry. Restored the file and Retry loaded the image successfully |
| Console | No unexplained application errors found. The intentionally missing image generated the expected network failure. The browser extension emitted an unrelated metadata message |

## Responsive and accessibility review

Production pages were rendered in 360px and 430px embedded browser viewports, plus desktop. Home, Browse, series, reader, Settings and Sources were inspected. Fixed a long-title update-card overflow and a two-pixel mobile edge overflow. Final Home and Settings measurements had `scrollWidth === clientWidth` at both phone widths; reader, series, Browse and Sources also fit their tested viewports. Desktop Home fit a 1280px frame (1265px usable width with scrollbar). Earlier desktop/mobile screenshots were inspected for layout and reading hierarchy.

Controls use native buttons, labeled selects/inputs, semantic links, visible focus indicators, text alternatives, dialogs with native modal behavior, a skip link, live feedback, reserved image dimensions, and reduced-motion CSS. Reader keyboard controls were reviewed alongside the exercised mode controls. This is a focused review, not a certified WCAG audit or exhaustive screen-reader test.

The temporary responsive harnesses and intentionally broken assets are **not** included in the release.

## Performance observations

- Static output is approximately 2.8 MB uncompressed; the shell precache contains 88 emitted files, excluding demo artwork.
- Original demo artwork is compressed WebP; all reading pages reserve their dimensions.
- Reader preloads only the configured zero to three pages ahead. Remote chapter downloads do not exist.
- Remote catalog pages contain at most 20 entries; metadata cache is bounded to 80 records with five-minute expiry. History is capped at 1,000 latest chapter visits.
- No synthetic Lighthouse score or throughput claim is made.

## Verification boundaries

- The cloud preview is HTTP on a non-localhost origin. Browser secure-context APIs for service-worker installation, CacheStorage and storage estimation are unavailable there. The actual worker's offline behavior was tested in the automated harness, but **physical Android/iOS installation, HTTPS service-worker lifecycle and airplane-mode reopening have not been exercised**. Verify on a target device after deployment: visit online, install, save demo offline, close/reopen in airplane mode, read a demo chapter, then reconnect.
- Optional WebMCP search registration is feature-detected. This browser did not expose `document.modelContext`, so a browser tool invocation could not be exercised; ordinary search was tested.
- No touch-device battery/memory profiling, long remote chapter stress test or formal assistive-technology audit was performed. V1 only reads the small original demo collections; Kitsu is metadata-only.
- External API rights, classifications, availability and CORS can change; integration checks must be repeated when adding a provider or before a public release.
