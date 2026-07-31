"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type RefObject,
} from "react";
import type { PublicShowcase } from "@/lib/public-showcase";

export type ShowcaseDataState =
  | "loading"
  | "ready"
  | "empty"
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
          className="modal-close"
          onClick={onClose}
          aria-label="Đóng tình huống"
          ref={closeButtonRef}
        >
          ×
        </button>
        <span className="modal-topic">{item.topic}</span>
        <h2 id={`showcase-modal-title-${item.id}`}>{item.title}</h2>
        <div className="showcase-detail">
          <span>NỘI DUNG TÌNH HUỐNG</span>
          <p>{item.summary}</p>
        </div>
        <a
          className="showcase-source"
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Xem nguồn chính thức <span aria-hidden="true">↗</span>
        </a>
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
        {showcases.map((item, index) => (
          <article
            className={`case-card ${index % 2 === 0 ? "yellow" : "mint"}`}
            data-showcase-id={item.id}
            key={item.id}
          >
            <div className="case-meta">
              <span>{item.topic}</span>
              <span>NGUỒN CHÍNH THỨC</span>
            </div>
            <h3>{item.title}</h3>
            <p className="case-summary">{item.summary}</p>
            <div className="showcase-actions">
              <button
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
                Xem chi tiết
              </button>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Nguồn <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
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
