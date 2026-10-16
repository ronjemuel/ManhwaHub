# ManhwaHub V1 architecture

Next.js App Router, React, TypeScript, and Tailwind. A static export keeps the personal reader deployable without a server or database. Query parameters identify runtime series and chapters on stable /series and /reader routes.

Feature UI → SourceRegistry → isolated providers → normalized entities. The registry handles enabled sources, timeouts, partial failures, policy filters, and bounded query caching. Provider IDs remain distinct unless an explicit curated mapping exists. Kitsu supplies metadata only; locally authored demo content supplies readable chapters.

Feature UI → UserRepository → IndexedDB. The repository interface allows a future remote implementation without changing UI. V1 has library, progress, history, settings, and metadata-cache object stores. Canonical series IDs and compound source/chapter progress keys prevent accidental cross-provider collisions.

Reader state keeps page index, page-relative offset, absolute scroll offset, reading fraction, mode, and timestamp. Position restoration waits for stable image dimensions; lifecycle saves cover navigation, visibility, and page exit. A completed chapter is monotonic until user data is reset. Source changes require user selection and exact chapter equivalence.

Unknown external age ratings are conservatively Mature; explicit data is never requested without opting in. Every entry surface applies content policy, including saved library/history and direct URLs. No HTML supplied by providers is inserted into the DOM.

PWA: a versioned, bounded same-origin shell cache. No third-party image cache or bulk downloads. Original demo pages may be explicitly cached from Data settings. JSON backups are strictly validated and atomically replace user stores. No secrets are required.

Development sequence follows the requested stages: foundations, source/data contracts, demo + screens, reader/storage, settings/backup/PWA, real metadata adapter, tests/audit/fixes/docs. Public accounts, synchronization, comments and remote downloads remain future work.
