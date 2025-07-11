// Zero Schema with Development Permissions
// This file defines the schema and permissions for Zero database access

import { ANYONE_CAN, definePermissions } from '@rocicorp/zero';

// Import the generated schema definition
import { schema as generatedSchema } from './frontend/src/lib/zero/generated-schema.ts';

// Export the schema for Zero deployment
export const schema = generatedSchema;

// Export development permissions configuration
export const permissions = definePermissions(generatedSchema, () => ({
  // Grant ANYONE_CAN access to all tables for development
  clients: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  users: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  people: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  contact_methods: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  devices: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  jobs: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  tasks: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  notes: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  activity_logs: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  scheduled_date_times: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  scheduled_date_time_users: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  job_assignments: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  job_people: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  job_targets: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } },
  task_completions: { row: { select: ANYONE_CAN, insert: ANYONE_CAN, update: { preMutation: ANYONE_CAN, postMutation: ANYONE_CAN }, delete: ANYONE_CAN } }
}));