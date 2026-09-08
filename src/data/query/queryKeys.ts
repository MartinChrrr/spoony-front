/**
 * Every key containing account data includes the authenticated user id.
 * This prevents React Query from serving account A's in-memory response after
 * account B signs in on the same device.
 */
export const queryKeys = {
  tasks: (userId: string) => ['tasks', userId] as const,
  overdueTasks: (userId: string) => ['tasks', userId, 'overdue'] as const,
  task: (userId: string, taskId: string) => ['task', userId, taskId] as const,
  taskLogs: (userId: string) => ['task-logs', userId] as const,
  taskLogsRange: (userId: string, from: string, to: string) =>
    ['task-logs', userId, 'range', from, to] as const,
  energyToday: (userId: string) => ['energy', userId, 'today'] as const,
  suggestions: (userId: string) => ['suggestions', userId] as const,
};
