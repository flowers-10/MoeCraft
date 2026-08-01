export type JobType="CLOSE_EXPIRED_ORDER"|"AUTO_CONFIRM_RECEIPT";
export type JobStatus="PENDING"|"RUNNING"|"RETRY"|"COMPLETED"|"DEAD_LETTER";
export type JobView={id:string;type:JobType;status:JobStatus;attempts:number;maxAttempts:number;runAt:string;lastError:string|null;deadLetterAt:string|null;createdAt:string;updatedAt:string};
