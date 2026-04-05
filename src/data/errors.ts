export class OfflineError extends Error {
  readonly code = 'OFFLINE_NO_WRITE' as const;
  constructor() {
    super('OFFLINE_NO_WRITE');
    this.name = 'OfflineError';
  }
}
