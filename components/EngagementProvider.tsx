"use client";

// Nguồn dữ liệu tương tác cho toàn trang công khai (US-033, US-034).
// Token nhận dạng trình duyệt là chuỗi ngẫu nhiên do chính máy người dùng
// sinh ra, chỉ nằm trong localStorage và chỉ dùng để không đếm trùng.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createEngagementClientId,
  engagementCountKey,
  isEngagementClientId,
  parseEngagementCounts,
  toEngagementCountMap,
  withEngagementCount,
  type EngagementAction,
  type EngagementCount,
  type EngagementEntityType,
} from "@/lib/engagement";

const clientIdStorageKey = "hssv-engagement-client-v1";
const favoritesStorageKey = "hssv-engagement-favorites-v1";
const maxStoredFavorites = 500;

export type EngagementContextValue = Readonly<{
  countOf(entityType: EngagementEntityType, entityId: number): EngagementCount;
  isFavorite(entityType: EngagementEntityType, entityId: number): boolean;
  trackView(entityType: EngagementEntityType, entityId: number): void;
  toggleFavorite(
    entityType: EngagementEntityType,
    entityId: number,
  ): Promise<void>;
}>;

function emptyCount(
  entityType: EngagementEntityType,
  entityId: number,
): EngagementCount {
  return { entityType, entityId, viewCount: 0, favoriteCount: 0 };
}

// Không có provider (ví dụ khi render tĩnh trong test) thì mọi thứ là no-op:
// giao diện vẫn hiển thị, chỉ là chưa có số liệu.
const inertContext: EngagementContextValue = Object.freeze({
  countOf: emptyCount,
  isFavorite: () => false,
  trackView: () => undefined,
  toggleFavorite: async () => undefined,
});

const EngagementContext = createContext<EngagementContextValue>(inertContext);

export function useEngagement(): EngagementContextValue {
  return useContext(EngagementContext);
}

// localStorage có thể ném lỗi (chế độ riêng tư, trình duyệt chặn) — mọi truy
// cập đều phải chịu được thất bại mà không làm hỏng trang.
function readStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Bỏ qua: mất trạng thái cục bộ không ảnh hưởng nội dung.
  }
}

function ensureClientId(): string {
  const stored = readStorage(clientIdStorageKey);
  if (isEngagementClientId(stored)) return stored;
  const created = createEngagementClientId((size) =>
    crypto.getRandomValues(new Uint8Array(size)),
  );
  writeStorage(clientIdStorageKey, created);
  return created;
}

// Danh sách yêu thích là trạng thái của riêng trình duyệt. Đọc qua
// useSyncExternalStore thay vì setState trong effect: snapshot phía server là
// "[]" nên không lệch hydration, và mọi component dùng chung một nguồn.
const favoriteListeners = new Set<() => void>();
let favoritesSnapshot: string | null = null;

function subscribeFavorites(listener: () => void): () => void {
  favoriteListeners.add(listener);
  return () => {
    favoriteListeners.delete(listener);
  };
}

function readFavoritesSnapshot(): string {
  favoritesSnapshot ??= readStorage(favoritesStorageKey) || "[]";
  return favoritesSnapshot;
}

const readServerFavoritesSnapshot = () => "[]";

// Giữ bản sao trong bộ nhớ làm nguồn chính: khi localStorage bị chặn, nút vẫn
// phản hồi đúng trong phiên đang mở.
function publishFavorites(favorites: ReadonlySet<string>): void {
  favoritesSnapshot = JSON.stringify(
    Array.from(favorites).slice(0, maxStoredFavorites),
  );
  writeStorage(favoritesStorageKey, favoritesSnapshot);
  for (const listener of favoriteListeners) listener();
}

function parseFavorites(snapshot: string): ReadonlySet<string> {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .filter((key): key is string => typeof key === "string")
        .slice(0, maxStoredFavorites),
    );
  } catch {
    return new Set();
  }
}

async function postEngagement(
  entityType: EngagementEntityType,
  entityId: number,
  action: EngagementAction,
): Promise<EngagementCount | null> {
  try {
    const response = await fetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        action,
        clientId: ensureClientId(),
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { count?: unknown };
    const parsed = parseEngagementCounts([body.count]);
    return parsed?.[0] ?? null;
  } catch {
    return null;
  }
}

export function EngagementProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<ReadonlyMap<string, EngagementCount>>(
    () => new Map(),
  );
  const favoritesJson = useSyncExternalStore(
    subscribeFavorites,
    readFavoritesSnapshot,
    readServerFavoritesSnapshot,
  );
  const favorites = useMemo(() => parseFavorites(favoritesJson), [favoritesJson]);
  // Mỗi phiên chỉ gửi một lần cho mỗi nội dung; server vẫn chốt chống trùng
  // theo ngày nên đây chỉ để tiết kiệm request.
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/engagement", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { counts?: unknown } | null) => {
        const parsed = parseEngagementCounts(body?.counts ?? []);
        if (active && parsed) setCounts(toEngagementCountMap(parsed));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const countOf = useCallback(
    (entityType: EngagementEntityType, entityId: number) =>
      counts.get(engagementCountKey(entityType, entityId)) ??
      emptyCount(entityType, entityId),
    [counts],
  );

  const isFavorite = useCallback(
    (entityType: EngagementEntityType, entityId: number) =>
      favorites.has(engagementCountKey(entityType, entityId)),
    [favorites],
  );

  const trackView = useCallback(
    (entityType: EngagementEntityType, entityId: number) => {
      const key = engagementCountKey(entityType, entityId);
      if (viewedRef.current.has(key)) return;
      viewedRef.current.add(key);
      void postEngagement(entityType, entityId, "view").then((count) => {
        if (count) setCounts((current) => withEngagementCount(current, count));
      });
    },
    [],
  );

  const toggleFavorite = useCallback(
    async (entityType: EngagementEntityType, entityId: number) => {
      const key = engagementCountKey(entityType, entityId);
      const wasFavorite = favorites.has(key);
      const nextFavorites = new Set(favorites);
      if (wasFavorite) nextFavorites.delete(key);
      else nextFavorites.add(key);
      // Cập nhật lạc quan để nút phản hồi tức thì, hoàn tác nếu server từ chối.
      publishFavorites(nextFavorites);

      const count = await postEngagement(
        entityType,
        entityId,
        wasFavorite ? "unfavorite" : "favorite",
      );
      if (!count) {
        publishFavorites(favorites);
        return;
      }
      setCounts((current) => withEngagementCount(current, count));
    },
    [favorites],
  );

  const value = useMemo<EngagementContextValue>(
    () => ({ countOf, isFavorite, trackView, toggleFavorite }),
    [countOf, isFavorite, trackView, toggleFavorite],
  );

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
}
