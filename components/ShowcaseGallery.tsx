"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type RefObject,
} from "react";
import type { PublicShowcase } from "@/lib/public-showcase";
import { showcaseMediaPreviewUrl } from "@/lib/showcase-media";
import { ContentMedia } from "./ContentMedia";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookIcon,
  CloseIcon,
  PlayIcon,
  TopicIcon,
  WarningIcon,
} from "./icons";
import { EngagementBar, EngagementStat } from "./EngagementBar";
import {
  useSharedContentId,
  useSharedContentUrl,
} from "./useSharedContentLink";

export type ShowcaseDataState =
  | "loading"
  | "ready"
  | "empty"
  | "no-match"
  | "degraded";

export type ShowcaseDialogState = Readonly<{
  selected: PublicShowcase | null;
}>;

export type ShowcaseDialogAction =
  | Readonly<{ type: "open"; item: PublicShowcase }>
  | Readonly<{ type: "close" }>;

type FocusTarget = {
  focus(): void;
  hasAttribute?(name: string): boolean;
};

type DialogTarget = {
  querySelectorAll(selector: string): ArrayLike<FocusTarget>;
};

type DialogKeyEvent = {
  key: string;
  shiftKey?: boolean;
  preventDefault(): void;
};

export function showcaseDialogReducer(
  state: ShowcaseDialogState,
  action: ShowcaseDialogAction,
): ShowcaseDialogState {
  if (action.type === "open") {
    return Object.freeze({ selected: action.item });
  }
  return state.selected === null ? state : Object.freeze({ selected: null });
}

export function handleShowcaseDialogKeyDown(
  event: DialogKeyEvent,
  dialog: DialogTarget,
  activeElement: unknown,
  close: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = Array.from(
    dialog.querySelectorAll(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((item) => !item.hasAttribute?.("disabled"));
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!focusable.includes(activeElement as FocusTarget)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function restoreShowcaseTriggerFocus(
  trigger: FocusTarget | null,
  schedule: (callback: () => void) => void = (callback) => {
    requestAnimationFrame(callback);
  },
) {
  schedule(() => trigger?.focus());
}

// Media minh họa dùng chung với kết quả tra cứu — xem `ContentMedia`.
export function ShowcaseMedia({ item }: { item: PublicShowcase }) {
  return (
    <ContentMedia
      kind={item.mediaKind}
      url={item.mediaUrl}
      imageAlt={`Ảnh minh họa tình huống: ${item.title}`}
      videoTitle={`Video minh họa tình huống: ${item.title}`}
    />
  );
}

type ShowcaseDialogProps = {
  item: PublicShowcase;
  onClose: () => void;
  dialogRef?: RefObject<HTMLElement | null>;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function ShowcaseDialog({
  item,
  onClose,
  dialogRef,
  closeButtonRef,
}: ShowcaseDialogProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal showcase-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`showcase-modal-title-${item.id}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Đóng tình huống"
          ref={closeButtonRef}
        >
          <CloseIcon />
        </button>
        <span className="modal-topic">{item.topic}</span>
        <h2 id={`showcase-modal-title-${item.id}`}>{item.title}</h2>
        <ShowcaseMedia item={item} />
        <div className="showcase-detail">
          <span>NỘI DUNG TÌNH HUỐNG</span>
          <p>{item.summary}</p>
        </div>
        {item.sourceUrl && (
          <a
            className="showcase-source"
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Xem nguồn chính thức <ArrowUpRightIcon />
          </a>
        )}
        <EngagementBar
          entityType="showcase"
          entityId={item.id}
          title={item.title}
        />
        <p className="modal-note">
          Nội dung được biên soạn để giáo dục và không thay thế tư vấn pháp lý
          cho vụ việc cụ thể.
        </p>
      </section>
    </div>
  );
}

export function ShowcaseGallery({
  state,
  showcases,
}: {
  state: ShowcaseDataState;
  showcases: readonly PublicShowcase[];
}) {
  const [dialog, dispatch] = useReducer(showcaseDialogReducer, {
    selected: null,
  });
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sharedId = useSharedContentId("showcase");
  const sharedAppliedRef = useRef(false);

  useSharedContentUrl("showcase", dialog.selected?.id ?? null);

  // Vào từ liên kết chia sẻ thì mở thẳng tình huống đó ngay khi dữ liệu về,
  // và chỉ một lần: người dùng đóng lại thì không bị mở đè nữa.
  useEffect(() => {
    if (sharedAppliedRef.current || sharedId === null) return;
    const match = showcases.find((item) => item.id === sharedId);
    if (!match) return;
    sharedAppliedRef.current = true;
    dispatch({ type: "open", item: match });
  }, [sharedId, showcases]);

  const closeDialog = useCallback(() => {
    const trigger = lastTriggerRef.current;
    dispatch({ type: "close" });
    restoreShowcaseTriggerFocus(trigger);
  }, []);

  useEffect(() => {
    if (!dialog.selected) return;
    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      handleShowcaseDialogKeyDown(
        event,
        dialogRef.current,
        document.activeElement,
        closeDialog,
      );
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog, dialog.selected]);

  if (state === "loading") {
    return (
      <div
        className="showcase-state"
        data-showcase-state="loading"
        role="status"
      >
        Đang tải các tình huống đã xuất bản…
      </div>
    );
  }
  if (state === "degraded") {
    return (
      <div
        className="showcase-state showcase-error"
        data-showcase-state="degraded"
        role="alert"
      >
        Kho tình huống đang tạm gián đoạn. Vui lòng thử lại sau.
      </div>
    );
  }
  if (state === "no-match") {
    return (
      <div className="showcase-state" data-showcase-state="no-match">
        Không có tình huống nào khớp với từ khóa hoặc lĩnh vực đang chọn.
      </div>
    );
  }
  if (state === "empty" || showcases.length === 0) {
    return (
      <div className="showcase-state" data-showcase-state="empty">
        Chưa có tình huống cảnh báo nào được xuất bản.
      </div>
    );
  }

  return (
    <>
      <div className="case-cards" data-showcase-state="ready">
        {showcases.map((item, index) => {
          const previewUrl = showcaseMediaPreviewUrl(item.mediaKind, item.mediaUrl);
          // Bài đầu tiên chiếm cột lớn; các bài sau xen kẽ thẻ nâu và thẻ ngang
          // để hàng thẻ không rơi vào kiểu ba cột đều nhau.
          const variant = index === 0 ? "" : index % 2 === 1 ? " dark" : " split";
          return (
            <article
              className={`case-card${variant}`}
              data-showcase-id={item.id}
              key={item.id}
            >
              {previewUrl && (
                <div className="case-thumb" data-media-kind={item.mediaKind}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Ảnh minh họa tình huống: ${item.title}`}
                    loading="lazy"
                    width={480}
                    height={270}
                  />
                  {item.mediaKind === "youtube" && (
                    <span className="case-thumb-play" aria-hidden="true">
                      <PlayIcon />
                    </span>
                  )}
                  {index === 0 && (
                    <span className="case-flag featured">
                      <WarningIcon /> Nổi bật
                    </span>
                  )}
                  <span className="case-flag topic">{item.topic}</span>
                </div>
              )}
              <div className="case-body">
                <p className="case-meta">
                  {previewUrl ? (
                    <BookIcon />
                  ) : (
                    <span className="topic-chip" data-topic={item.topic}>
                      <TopicIcon topic={item.topic} />
                      {item.topic}
                    </span>
                  )}
                  {item.sourceUrl ? "Có nguồn chính thức" : "Biên soạn nội bộ"}
                </p>
                <h3>{item.title}</h3>
                <p className="case-summary">{item.summary}</p>
                <div className="case-foot">
                  <EngagementStat entityType="showcase" entityId={item.id} />
                  <div className="showcase-actions">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Xem chi tiết tình huống: ${item.title}`}
                      ref={(node) => {
                        if (node && dialog.selected?.id === item.id) {
                          lastTriggerRef.current = node;
                        }
                      }}
                      onClick={(event) => {
                        lastTriggerRef.current = event.currentTarget;
                        dispatch({ type: "open", item });
                      }}
                    >
                      Xem chi tiết <ArrowRightIcon />
                    </button>
                    {item.sourceUrl && (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        Nguồn <ArrowUpRightIcon />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {dialog.selected && (
        <ShowcaseDialog
          item={dialog.selected}
          onClose={closeDialog}
          dialogRef={dialogRef}
          closeButtonRef={closeButtonRef}
        />
      )}
    </>
  );
}
