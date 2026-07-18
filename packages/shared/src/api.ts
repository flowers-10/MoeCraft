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
