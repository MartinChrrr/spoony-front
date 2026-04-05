export interface JSendResponse<T> {
  status: 'success' | 'fail' | 'error';
  data: T | null;
  message: string | null;
}

export type Mood = 'GREAT' | 'GOOD' | 'OK' | 'BAD' | 'AWFUL';
export type Importance = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskLogStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED';
