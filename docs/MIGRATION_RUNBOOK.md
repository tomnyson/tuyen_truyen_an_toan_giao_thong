# Sites + Cloudflare D1 Migration Runbook

> Production target: Sites-hosted Cloudflare Worker + D1 (DEC-001)  
> Deployment status: **BLOCKED**. This repository proves only that ordered
> migration inputs are packaged. It does not prove that the Sites control plane
> applies them exactly once or before application activation.

## 1. Repository deployment contract

This repository does not contain a `wrangler.toml`, `wrangler.json`,
`wrangler.jsonc`, `migrations_dir` or a real D1 database identifier suitable for
a safe manual Wrangler migration.

The repository-side packaging path is the Sites build pipeline:

1. `.openai/hosting.json` identifies the Sites project and declares D1 binding
   `DB`.
2. `build/sites-vite-plugin.ts` copies `.openai/hosting.json` and the complete
   `drizzle/` directory to `dist/.openai/`.

The static repository contract test verifies only those two packaging facts.
It is not evidence that any migration was submitted, executed, recorded exactly
once, or completed before code activation.

Current read-only control-plane checks cannot resolve the Sites project
referenced by `.openai/hosting.json`; project ownership/access and the D1
environment binding are therefore **UNVERIFIED**. Preflight must resolve access
to that exact opaque project ID. Do not create a replacement project, derive an
ID, or substitute another project's ID. Production deployment remains blocked
until the Sites control plane provides migration status and a verifiable
migration-before-activation guarantee.

Do **not** run `wrangler d1 migrations apply` using the binding name `DB`, a
guessed database name or a database identifier copied from another environment.
That path is prohibited until the repository has an explicit, reviewed Wrangler
configuration and a verified environment-to-database mapping.

## 2. Scope of migration 0001

`0001_citation_foundation` is expand-only. It creates:

- `legal_sources`;
- `legal_provisions`;
- `legal_entry_citations`;
- indexes and integrity checks;
- creator-immutability, publication and source-invalidation triggers.

It does not alter or seed `legal_entries`/`showcases`, and current public/admin
APIs do not depend on the new tables. Do not add legal-source seed or mapping to
this migration. Backfill requires approval from the internal content reviewer
under the four-eyes workflow.

## 3. Preflight

1. Confirm the intended Sites project and environment. Treat IDs returned by
   Sites as opaque; do not derive or substitute them. Confirm that the operator
   can resolve the exact project referenced by `.openai/hosting.json`; the
   current repository review could not.
2. Confirm the exact source commit to build and deploy.
3. Run repository checks:

   ```bash
   npm run lint
   npx tsc --noEmit
   node --test tests/schema-foundation.test.mjs
   npm test
   ```

4. Build the exact source state:

   ```bash
   npm run build
   ```

5. Inspect the artifact before saving/deploying a Sites version:

   ```text
   dist/.openai/hosting.json
   dist/.openai/drizzle/0000_groovy_cerise.sql
   dist/.openai/drizzle/0001_citation_foundation.sql
   dist/.openai/drizzle/meta/_journal.json
   ```

6. Confirm journal order is `0000` then `0001`, and that migration 0001 contains
   no `INSERT INTO` legal-content seed.
7. Through the Sites/D1 control plane, create or record a pre-migration backup,
   Time Travel bookmark/timestamp or equivalent restore point. Assign an owner
   and verify the restore procedure before continuing.

## 4. Migration-before-activation gate

Save/publish the candidate source artifact through the Sites workflow, but do
not activate the application version until the control plane reports:

- the artifact is associated with the intended Sites project;
- D1 binding `DB` resolves to the intended environment database;
- ordered migrations through `0001_citation_foundation` completed exactly once;
- no migration is failed, pending or partially applied.

If the Sites workflow cannot expose migration status before activation, stop.
Do not bypass the gate with ad-hoc Wrangler commands. The deployment remains
blocked until the control plane or hosting configuration provides a verifiable
migration-before-code guarantee.

## 5. Database verification

Use the read-only query facility attached to the exact Sites/D1 environment:

```sql
SELECT name, type
FROM sqlite_master
WHERE name LIKE 'legal_%'
ORDER BY type, name;

PRAGMA foreign_key_check;
PRAGMA integrity_check;

SELECT name
FROM sqlite_master
WHERE type = 'trigger'
  AND name IN (
    'legal_provisions_created_by_immutable',
    'legal_provisions_published_source_insert_check',
    'legal_provisions_published_source_update_check',
    'legal_sources_created_by_immutable',
    'legal_sources_invalidate_published_provisions'
  )
ORDER BY name;
```

Expected:

- three new tables and six explicit indexes exist;
- all five triggers exist;
- `PRAGMA foreign_key_check` returns no rows;
- `PRAGMA integrity_check` returns `ok`;
- the control plane records migration 0001 exactly once.

Constraint probes belong in a non-production D1 clone. They must prove:

- non-HTTPS URLs are rejected;
- `official_host` is lowercase, contains only `a-z0-9.-`, and contains no `..`;
- URL authority matches `official_host`, including URL query/fragment cases;
- non-draft sources outside the approved host allowlist are rejected;
- creator and verifier/reviewer cannot be the same;
- `created_by` cannot be reassigned after insert to bypass the four-eyes rule;
- a published provision cannot reference a draft/unverified source;
- invalidating a source moves dependent published provisions to
  `pending_review` and clears review metadata;
- a valid source, provision and citation graph succeeds.

## 6. Activate and smoke test

Only after migration and database verification:

1. activate/deploy the saved Sites version built from the exact verified source;
2. confirm the Worker starts and existing public/admin routes still work;
3. confirm current routes do not write to the new tables;
4. confirm chat remains fail-closed outside reviewed retrieval;
5. monitor Worker and D1 errors before ending the maintenance window.

## 7. Rollback and restore

Because migration 0001 is expand-only, the preferred application rollback is:

1. roll back the Sites application version;
2. leave the unused new tables in place;
3. investigate without dropping tables or editing migration history.

There is intentionally no automatic down migration. Dropping the foundation
tables can destroy future citation data and is not a routine rollback.

If migration execution corrupts or blocks D1:

1. prevent application version activation and stop writes;
2. capture control-plane migration status and logs;
3. restore the recorded D1 Time Travel point or validated backup through the
   same environment's approved control-plane procedure;
4. run `foreign_key_check`, `integrity_check` and application smoke tests;
5. document the incident before attempting a corrected, newly versioned
   migration.

Never modify migration 0001 after it has been applied to a shared environment.
Corrections require a new migration.

## 8. Drizzle metadata limitation

`drizzle/meta/_journal.json` records migration 0001, and the Sites artifact
contains both the journal and SQL file. Sprint 1B did not fabricate a
`0001_snapshot.json`. Before relying on a Drizzle Kit workflow that requires
snapshots, regenerate/validate metadata with the pinned `drizzle-kit` version
and review the resulting diff. The reviewed SQL migration remains the
production source of truth.
