"use client";

// Nút "Chia sẻ" mở một menu các mạng xã hội (US-034). Trên điện thoại có Web
// Share API thì thêm mục chia sẻ hệ thống lên đầu; máy tính vẫn đăng thẳng lên
// Facebook/Zalo/X/Telegram qua liên kết web-intent.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  buildShareTarget,
  shareChannels,
  shareOpenMessage,
  shareOutcomeMessage,
  shareTarget,
  type ShareTarget,
} from "@/lib/share";

const subscribeToNavigator = () => () => {};
const readNativeShare = () => typeof navigator.share === "function";
const readServerNativeShare = () => false;

type ShareMenuProps = Readonly<{
  title: string;
  url: string;
  onStatus: (message: string) => void;
}>;

export function ShareMenu({ title, url, onStatus }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canShareNatively = useSyncExternalStore(
    subscribeToNavigator,
    readNativeShare,
    readServerNativeShare,
  );

  // Bấm ra ngoài hoặc Esc thì đóng menu — quen thuộc với người dùng.
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const target = buildShareTarget(title, url);
  const channels = shareChannels(target);

  async function runShare(deps: Parameters<typeof shareTarget>[1]) {
    setOpen(false);
    onStatus(shareOutcomeMessage(await shareTarget(target, deps)));
  }

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        className="engagement-share"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">↗</span>
        Chia sẻ
      </button>
      {open && (
        <div
          className="share-sheet"
          role="menu"
          aria-label="Chia sẻ nội dung này"
        >
          {canShareNatively && (
            <button
              type="button"
              role="menuitem"
              className="share-option"
              onClick={() => {
                void runShare({
                  share: (value: ShareTarget) => navigator.share({ ...value }),
                });
              }}
            >
              <span className="share-mark" aria-hidden="true">
                ↗
              </span>
              Chia sẻ nhanh
            </button>
          )}
          {channels.map((channel) => (
            <a
              key={channel.id}
              role="menuitem"
              className="share-option"
              href={channel.href}
              target="_blank"
              rel="noreferrer"
              data-channel={channel.id}
              onClick={() => {
                setOpen(false);
                onStatus(shareOpenMessage(channel.label));
              }}
            >
              <span className="share-mark" aria-hidden="true">
                {channel.mark}
              </span>
              {channel.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            className="share-option"
            onClick={() => {
              void runShare({
                copy: navigator.clipboard
                  ? (value: string) => navigator.clipboard.writeText(value)
                  : undefined,
              });
            }}
          >
            <span className="share-mark" aria-hidden="true">
              🔗
            </span>
            Sao chép liên kết
          </button>
        </div>
      )}
    </div>
  );
}
