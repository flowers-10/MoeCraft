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
