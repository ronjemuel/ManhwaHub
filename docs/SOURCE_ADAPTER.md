# Source adapter contract

## Boundary

Application features import `registry` from `src/sources/registry.ts`, never a concrete provider. A provider implements `MangaSource` in `src/sources/types.ts`. Put all endpoints, response schemas, mapping, and provider-specific errors in `src/sources/<provider>/`.

The normalized domain lives in `src/types/index.ts`. Series IDs use `<provider>:<externalId>` by default. Never derive identity from a normalized title. An explicitly curated cross-source mapping can assign the same `canonicalId` and populate `sources`; the bundled two demo editions show this. The registry deduplicates only identical canonical IDs, not similar titles.

## Before adding an adapter

1. Read the provider's current official API documentation and terms. Record URLs and the date checked. Confirm the intended metadata, image display, commercial use, caching, and download rights separately.
2. Use documented public APIs or authorized access only. Never scrape around a CAPTCHA, anti-bot denial, login, paywall, regional restriction, or access control. Stop on a restriction and expose a useful error.
3. Metadata access does not imply chapter-image or download permission. Declare `reader` only if authorized page URLs are actually provided. `offline-demo` is specifically for this project's original demo assets; do not apply it to a remote source.
4. An API with secrets needs a server-side gateway, environment variables, host allowlists, timeout, and rate limiting. Do not add secrets to this static client or NEXT_PUBLIC variables. Moving beyond static export is an explicit infrastructure decision for a future version.

## Implementation

- Export a `MangaSource` with a stable `info.id`, clear name, metadata/chapter language list, conservative ratings, honest capability list, and official website.
- `search(query, context)` returns a bounded `SourcePage` with `items`, `hasNextPage`, and any filtering limitations in `notice`. Honor `page` and never enumerate an entire catalog.
- `getPopular` and `getLatest` return the same shape. A metadata-updated timestamp is not a chapter release timestamp; label it accordingly.
- `getSeries` returns validated normalized `Series`. Use `normalizeSeries` / `seriesSchema` and plain text descriptions. Never use `dangerouslySetInnerHTML`.
- `getChapters` returns stable source IDs, number or null, volume or null, language, release date or null, and title. Return chapters oldest to newest. Don't fabricate unavailable authors, ratings, counts, dates, chapters, or pages.
- `getPages` returns reading-order pages with stable IDs, permitted URL, accurate dimensions and descriptive alt text. The Reader handles layout, lazy loading, bounded preloading, failures and restoration.
- Propagate the `context.signal` to network requests. Respect provider 429 responses and documented limits. Never retry around an access denial.
- Validate provider response envelopes with Zod. Reject unsafe asset schemes, malformed IDs, missing required fields, and nonfinite numeric data. Treat unsupported or unknown content classification as Mature; classify adult content conservatively as Explicit.
- Add the instance to the SourceRegistry constructor. No Reader/UI edits are required. Add its ID to defaults only if a working initial integration was verified and default use is intended.

## Registry behavior

Only enabled, language-compatible providers participate in search. Requests time out after 12 seconds. Partial failures are returned as visible errors while successful providers still supply results. Five-minute query and series caches are bounded to 80 IndexedDB entries. Runtime health starts `untested`, becomes available only after a successful actual request, and reports failed requests honestly. Cache hits alone do not certify current availability.

All UI entry surfaces and direct series/reader loads apply the content policy. Filters unsupported by a provider are applied to its current result page, with pagination preserved. The UI must explain an empty filtered page and permit requesting the next page.

## Switching sources

The user explicitly chooses among `Series.sources`. A disabled source cannot be selected. The Reader asks the target adapter for chapters and transfers position only when exactly one chapter has an equal non-null number, equal volume, and equal language. If ambiguous, it opens the target series to choose a chapter. No automatic failover is performed. More sophisticated equivalence needs explicit provider-supported identifiers in a future version.

## Tests to add

Validate representative API fixtures, missing/invalid values, age policy, pagination, unsupported capabilities, timeout, cancellation and 429 errors. Verify direct links and source disable behavior. Test page dimensions/reader restoration and exact vs ambiguous chapter equivalence if the source is readable. Test actual access separately and record the result without treating fixture tests as a successful live connection.

## V1 integration record

- Kitsu official API specification: https://kitsu.docs.apiary.io/
- Official specification source: https://github.com/hummingbird-me/api-docs
- Public JSON:API endpoint: https://kitsu.io/api/edge/manga
- Integration verified 2026-09-20: public GET returned validated manga data; browser Home populated real metadata with images. No login/API key needed for these public metadata reads. Kitsu does not supply a chapter reader in this integration. Source attribution and official listing links are retained.
- Kitsu offers an age classification but many records have none. G → Safe; PG → Suggestive; R and unknown → Mature; R18 → Explicit. Unknown records are intentionally absent from default results.
- Kitsu limits pages to 20. Genre/status/rating/language are normalized filters on each page; text and supported subtype are server queries. English refers to metadata presentation, not available licensed chapter translations.
- AniList was investigated and excluded: live API requests were blocked by its security service, and its terms restrict competing list/tracker applications. No bypass was attempted. Jikan's probe returned an upstream failure and it was not integrated.
- AquaScans, MangaGo and other unofficial sites are not integrated. No invented endpoints or redistribution rights are assumed.
