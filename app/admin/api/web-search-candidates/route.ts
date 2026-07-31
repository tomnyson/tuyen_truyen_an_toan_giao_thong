import {
  getAdminRequestActor,
  hasTrustedOrigin,
} from "@/lib/admin-auth";
import {
  listWebSearchCandidates,
  resolveEditorialActor,
  saveWebSearchCandidateRevision,
  transitionWebSearchCandidate,
} from "@/lib/web-search-candidates";

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function authorize(request: Request, mutation = false) {
  const sessionActor = await getAdminRequestActor(request);
  if (!sessionActor) {
    return {
      denied: noStoreJson({ error: "Phiên đăng nhập đã hết hạn." }, 401),
      actor: null,
    };
  }
  if (mutation && !hasTrustedOrigin(request)) {
    return {
      denied: noStoreJson({ error: "Yêu cầu không hợp lệ." }, 403),
      actor: null,
    };
  }
  const actor = await resolveEditorialActor(
    sessionActor.principalId,
    sessionActor.username,
  );
  if (!actor) {
    return {
      denied: noStoreJson(
        {
          error:
            "Tài khoản chưa được gắn principal/role active trong D1.",
        },
        403,
      ),
      actor: null,
    };
  }
  return { denied: null, actor };
}

export async function GET(request: Request) {
  const { denied, actor } = await authorize(request);
  if (denied || !actor) return denied;
  try {
    const data = await listWebSearchCandidates();
    const sourcesByCandidate = new Map<string, Record<string, unknown>[]>();
    const revisionsByCandidate = new Map<string, Record<string, unknown>[]>();
    const eventsByCandidate = new Map<string, Record<string, unknown>[]>();
    for (const [values, key, target] of [
      [data.sources, "candidate_id", sourcesByCandidate],
      [data.revisions, "candidate_id", revisionsByCandidate],
      [data.events, "candidate_id", eventsByCandidate],
    ] as const) {
      for (const value of values) {
        const id = value[key];
        if (typeof id !== "string") continue;
        const bucket = target.get(id) ?? [];
        bucket.push(value);
        target.set(id, bucket);
      }
    }
    const candidates = data.candidates.map((candidate) => {
      const id = String(candidate.id);
      const revisions = revisionsByCandidate.get(id) ?? [];
      const current = revisions.find(
        (revision) => revision.id === candidate.current_revision_id,
      );
      let snapshot: unknown = null;
      if (typeof current?.canonical_snapshot_json === "string") {
        try {
          snapshot = JSON.parse(current.canonical_snapshot_json);
        } catch {
          snapshot = null;
        }
      }
      return {
        id,
        initialAnswer: candidate.initial_answer_text,
        providerModel: candidate.provider_model,
        inputTokens: candidate.input_tokens,
        outputTokens: candidate.output_tokens,
        totalTokens: candidate.total_tokens,
        status: candidate.lifecycle_status,
        optimisticVersion: candidate.optimistic_version,
        editorPrincipalId: candidate.editor_principal_id,
        reviewerPrincipalId: candidate.reviewer_principal_id,
        reviewReason: candidate.review_reason,
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at,
        snapshot,
        sources: (sourcesByCandidate.get(id) ?? []).map((source) => ({
          title: source.title,
          url: source.official_url,
        })),
        history: (eventsByCandidate.get(id) ?? []).map((event) => ({
          action: event.action,
          actorPrincipalId: event.actor_principal_id,
          actorRole: event.actor_role,
          reason: event.reason,
          occurredAt: event.occurred_at,
        })),
      };
    });
    return noStoreJson({
      actor: {
        username: actor.username,
        principalId: actor.principalId,
        roles: actor.roles,
      },
      candidates,
    });
  } catch {
    return noStoreJson({ error: "Không thể tải candidate từ D1." }, 503);
  }
}

export async function PATCH(request: Request) {
  const { denied, actor } = await authorize(request, true);
  if (denied || !actor) return denied;
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (
    !body ||
    "actor" in body ||
    "actorRole" in body ||
    "principalId" in body
  ) {
    return noStoreJson({ error: "Payload không hợp lệ." }, 400);
  }
  const candidateId =
    typeof body.candidateId === "string" ? body.candidateId : "";
  const expectedVersion = Number(body.expectedVersion);
  const action = typeof body.action === "string" ? body.action : "";
  if (
    !/^[0-9a-f-]{36}$/i.test(candidateId) ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0
  ) {
    return noStoreJson({ error: "Candidate hoặc version không hợp lệ." }, 400);
  }
  try {
    const result =
      action === "save_revision"
        ? await saveWebSearchCandidateRevision(
            actor,
            candidateId,
            expectedVersion,
            body.snapshot,
          )
        : action === "submit" ||
            action === "approve" ||
            action === "reject" ||
            action === "archive"
          ? await transitionWebSearchCandidate(
              actor,
              candidateId,
              expectedVersion,
              action,
              typeof body.reason === "string" ? body.reason : undefined,
            )
          : null;
    return result
      ? noStoreJson({ ok: true, ...result })
      : noStoreJson(
          {
            error:
              "Thao tác bị từ chối do quyền, dữ liệu, trạng thái hoặc version đã thay đổi.",
          },
          409,
        );
  } catch {
    return noStoreJson(
      { error: "Không thể cập nhật workflow candidate." },
      503,
    );
  }
}
