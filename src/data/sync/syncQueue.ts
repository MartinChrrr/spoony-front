export interface SyncOperation {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export const syncQueue = {
  async add(_operation: SyncOperation): Promise<void> {
    if (__DEV__) console.log('syncQueue not implemented yet');
  },
  async getAll(): Promise<SyncOperation[]> {
    return [];
  },
  async clear(): Promise<void> {
    // TODO: Niveau 2
  },
};
