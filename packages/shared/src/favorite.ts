export type FavoriteView = {
  id: string;
  targetType: "PRODUCT" | "STORE";
  targetId: string;
  createdAt: string;
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};
