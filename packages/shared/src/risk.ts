export type RiskFlagView = {
  id: string;
  userId: string | null;
  ipAddress: string | null;
  type: string;
  severity: string;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type ReportView = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  handledBy: string | null;
  handledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
