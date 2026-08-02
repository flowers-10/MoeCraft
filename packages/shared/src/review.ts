export type ReviewView = {
  id: string;
  userId: string;
  buyerDisplayName: string;
  orderItemId: string;
  productId: string;
  productTitle: string;
  skuName: string;
  coverFileId: string | null;
  rating: number;
  content: string;
  images: string[];
  isHidden: boolean;
  reply: ReviewReply | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewReply = {
  content: string;
  repliedBy: string;
  repliedAt: string;
};

export type ReviewListItem = Pick<ReviewView,
  "id" | "userId" | "buyerDisplayName" | "productTitle" | "rating" | "content" | "isHidden" | "createdAt"
>;

export type ProductRatingSummary = {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
};
