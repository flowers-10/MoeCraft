import type { FavoriteView, NotificationView } from "@moecraft/shared";

export function useFavorites() {
  const { request } = useApi();
  const toggle = (targetType: string, targetId: string) => request<{ favorited: boolean }>("/favorites", { method: "POST", body: { targetType, targetId } });
  const list = (type?: string) => request<FavoriteView[]>("/favorites" + (type ? "?type=" + encodeURIComponent(type) : ""));
  const check = (targetType: string, targetId: string) => request<{ favorited: boolean }>("/favorites/check/" + encodeURIComponent(targetType) + "/" + encodeURIComponent(targetId));
  return { toggle, list, check };
}

export function useNotifications() {
  const { request } = useApi();
  const list = (unreadOnly = false) => request<NotificationView[]>("/notifications" + (unreadOnly ? "?unread=true" : ""));
  const unreadCount = () => request<{ count: number }>("/notifications/unread-count");
  const markRead = (id: string) => request<void>("/notifications/" + encodeURIComponent(id) + "/read", { method: "PATCH" });
  const markAllRead = () => request<void>("/notifications/read-all", { method: "PATCH" });
  return { list, unreadCount, markRead, markAllRead };
}
