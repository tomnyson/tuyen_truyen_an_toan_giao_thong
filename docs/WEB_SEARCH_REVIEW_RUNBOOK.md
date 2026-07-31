# Web-search candidate review and RAG runbook

> Scope: US-028 / DEC-011. This runbook does not authorize production
> activation. The migration, privacy and deployment gates still apply.

## 1. Required server configuration

Keep all values in the deployment secret/config manager, never in Git:

```dotenv
ADMIN_SESSION_SECRET=<at least 32 characters>
ADMIN_ACCOUNTS_JSON=[{"username":"editor","passwordHash":"<v1 pbkdf2 hash>","principalId":"editor-a"},{"username":"reviewer","passwordHash":"<v1 pbkdf2 hash>","principalId":"reviewer-a"}]
AI_WEB_SEARCH_DAILY_TOKEN_BUDGET=500000
AI_WEB_SEARCH_RESERVATION_TOKENS=12000
AI_WEB_SEARCH_ENABLED=false
```

Generate each password hash separately with `npm run auth:hash`. Registry
account roles are not trusted: `principalId` must match an active D1 principal
and role grant. Use two people/accounts; one person must not possess both
credentials for the same review.

## 2. Principal provisioning

Run only through the reviewed D1 control plane after migration 0003/0005. If
the database already has an active admin, use that principal as grantor. The
first self-admin grant is only for a completely empty role-grant table.

```sql
INSERT INTO editorial_principals (id, display_name)
VALUES
  ('admin-a', 'Content Admin'),
  ('editor-a', 'Content Editor'),
  ('reviewer-a', 'Content Reviewer');

INSERT INTO editorial_role_grants (
  id, principal_id, role, granted_by_principal_id
) VALUES
  ('grant-admin-a', 'admin-a', 'admin', 'admin-a'),
  ('grant-editor-a', 'editor-a', 'editor', 'admin-a'),
  ('grant-reviewer-a', 'reviewer-a', 'reviewer', 'admin-a');
```

Replace IDs/display names deliberately; ensure they exactly match
`ADMIN_ACCOUNTS_JSON`. Verify:

```sql
SELECT p.id, p.display_name, p.status, g.role, g.revoked_at
FROM editorial_principals p
JOIN editorial_role_grants g ON g.principal_id = p.id
ORDER BY p.id, g.role;
```

## 3. Editorial workflow

1. Keep `AI_WEB_SEARCH_ENABLED=false` while validating the CMS.
2. A successful allowed-source search creates a `draft`; no raw question is
   stored.
3. Editor opens **Quản trị → Bản nháp từ AI**, verifies the original source,
   writes a clear title/answer/tags and fills document number, article/clause/
   point, effective dates and `lastVerifiedAt`.
4. Editor saves a revision, then clicks **Gửi duyệt**.
5. Reviewer logs in with a different account, opens every official link and
   checks mapping, effectivity, explanation and student-safe wording.
6. Reviewer either records a rejection reason or clicks
   **Duyệt & đưa vào RAG**.
7. Only `published` candidates with current/fresh citations can answer future
   questions. Archive immediately when a source expires or mapping is in doubt.

## 4. Smoke and rollback

Before enabling live search, verify with a non-personal technical question:

- response is `mode=web_search` and D1 has one draft + sources + event;
- raw question/message is absent from every table;
- editor can save/submit but cannot approve;
- reviewer can reject/approve; published result is retrieved before another
  provider call;
- archive removes it from retrieval;
- telemetry contains request/candidate/model/token metadata only;
- budget ceiling returns the safe unavailable response.

Rollback: set `AI_WEB_SEARCH_ENABLED=false`. This stops new provider searches
without deleting reviewed content or audit history. If reviewed candidate data
is suspect, archive affected candidates; never hard-delete them.
