import type { IsoDateTime } from "./primitives";

export type AppHealth = Readonly<{
  name: string;
  status: "ok";
  time: IsoDateTime;
}>;

export type ApiSuccess<Data> = Readonly<{
  data: Data;
  requestId: string;
}>;

export type ApiError<Code extends string = string> = Readonly<{
  code: Code;
  message: string;
  requestId: string;
  details?: Readonly<Record<string, unknown>>;
}>;
import type { MerchantApplicationStatus } from "./statuses";

export type MerchantApplicationProfile = {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  businessLicenseNumber: string;
  qualificationFileIds: string[];
  agreementAccepted: boolean;
};

export type MerchantApplicationTimelineItem = {
  id: string;
  fromStatus: MerchantApplicationStatus | null;
  toStatus: MerchantApplicationStatus;
  comment: string | null;
  actorId: string;
  createdAt: string;
};

export type MerchantApplicationView = MerchantApplicationProfile & {
  id: string;
  applicantId: string;
  status: MerchantApplicationStatus;
  reviewComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  merchantStatus: "ACTIVE" | "SUSPENDED" | "CLOSED" | null;
  timeline: MerchantApplicationTimelineItem[];
};

export type StoreReturnAddress = { recipient: string; phone: string; country: string; province: string; city: string; district: string; addressLine: string; postalCode?: string };
export type StoreProfileView = { id: string; merchantId: string; name: string; slug: string; logoFileId: string | null; bannerFileId: string | null; description: string | null; customerServiceEmail: string | null; customerServicePhone: string | null; returnAddress: StoreReturnAddress | null; isOpen: boolean; merchantStatus: "ACTIVE" | "SUSPENDED" | "CLOSED"; updatedAt: string };
export type MerchantMemberView = { id: string; userId: string; username: string; displayName: string; role: "OWNER" | "STAFF"; createdAt: string };
export type StaffInvitationView = { id: string; merchantId: string; merchantName: string; inviteeId: string; inviteeName: string; role: "OWNER" | "STAFF"; status: "PENDING" | "ACCEPTED" | "CANCELLED"; expiresAt: string };
