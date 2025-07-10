// Zero client and configuration exports
export { initZero, getZero, closeZero } from './client';
export { schema, type ZeroClient } from './schema';

// Zero reactive hooks for Svelte
export {
  useUsers,
  useUser,
  useClients,
  useClient,
  useJobs,
  useJob,
  useTasksByJob,
  useTask,
  useJobAssignmentsByUser,
  useNotesByJob,
} from './hooks';

// Zero user hooks and mutations
export {
  useUsersQuery,
  useTechniciansQuery,
  useUserQuery,
  useUserLookup,
  createUser,
  updateUser,
  deleteUser,
  updateJobTechnicians,
} from './users';

// Zero client hooks and mutations
export {
  useClientsQuery,
  useClientQuery,
  useClientByUuidQuery,
  useClientWithRelationsQuery,
  useClientsPaginatedQuery,
  useClientSearchQuery,
  useClientStatsQuery,
  useClientLookup,
  createClient,
  updateClient,
  deleteClient,
  restoreClient,
} from './clients';

// Zero job hooks and mutations
export {
  useJobsQuery,
  useJobQuery,
  useJobsByClientQuery,
  useJobsByTechnicianQuery,
  useJobsByStatusQuery,
  useJobStatsQuery,
  useRecentJobsQuery,
  useJobLookup,
  createJob,
  updateJob,
  deleteJob,
  restoreJob,
  updateJobStatus,
  updateJobPriority,
  assignTechniciansToJob,
  removeTechnicianFromJob,
  duplicateJob,
  bulkUpdateJobs,
} from './jobs';

// Zero task hooks and mutations
export {
  useTasksByJobQuery,
  useTaskQuery,
  useRootTasksQuery,
  useSubtasksQuery,
  useTasksByStatusQuery,
  useTaskHierarchyQuery,
  useTaskStatsQuery,
  useTaskUtils,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  updateTaskStatus,
  moveTaskToParent,
  reorderTasks,
  batchMoveTasks,
  duplicateTask,
} from './tasks';

// Migration utilities
export {
  wrapZeroQuery,
  createMigrationHook,
  convertZeroUserToApiUser,
  convertZeroUsersToApiUsers,
  migrationFlags,
  compareMigrationData,
} from './migration-utils';

// Re-export Zero types and utilities
export type { Zero } from '@rocicorp/zero';