import { 
  createSchema, 
  table, 
  string, 
  number, 
  boolean, 
  json,
  relationships,
  type Zero
} from '@rocicorp/zero';

// User table
const user = table('users')
  .columns({
    id: string(),
    uuid: string(),
    email: string(),
    name: string(),
    password_digest: string(),
    role: string(), // 'admin', 'technician', 'owner'
    resort_tasks_on_status_change: boolean(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
  })
  .primaryKey('id');

// Client table
const client = table('clients')
  .columns({
    id: string(),
    uuid: string(),
    name: string(),
    name_normalized: string(),
    email: string().optional(),
    phone: string().optional(),
    address: string().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
  })
  .primaryKey('id');

// Job table
const job = table('jobs')
  .columns({
    id: string(),
    uuid: string(),
    client_id: string(),
    title: string(),
    description: string().optional(),
    status: string(), // 'draft', 'scheduled', 'in_progress', 'completed', 'cancelled'
    priority: string(), // 'low', 'medium', 'high', 'critical'
    due_date: string().optional(),
    start_date: string().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
    lock_version: number(),
  })
  .primaryKey('id');

// Task table
const task = table('tasks')
  .columns({
    id: string(),
    uuid: string(),
    job_id: string(),
    parent_id: string().optional(),
    title: string(),
    description: string().optional(),
    status: string(), // 'pending', 'in_progress', 'completed', 'cancelled'
    position: number(),
    due_date: string().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
    reordered_at: string().optional(),
    lock_version: number(),
  })
  .primaryKey('id');

// Job Assignment (technician assignments)
const jobAssignment = table('job_assignments')
  .columns({
    id: string(),
    uuid: string(),
    job_id: string(),
    user_id: string(),
    created_at: string(),
    updated_at: string(),
  })
  .primaryKey('id');

// Person (contact for client)
const person = table('people')
  .columns({
    id: string(),
    uuid: string(),
    client_id: string(),
    name: string(),
    email: string().optional(),
    phone: string().optional(),
    role: string().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
  })
  .primaryKey('id');

// Note
const note = table('notes')
  .columns({
    id: string(),
    uuid: string(),
    job_id: string().optional(),
    user_id: string(),
    content: string(),
    metadata: json().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
  })
  .primaryKey('id');

// Device
const device = table('devices')
  .columns({
    id: string(),
    uuid: string(),
    client_id: string(),
    person_id: string().optional(),
    name: string(),
    device_type: string().optional(),
    model: string().optional(),
    serial_number: string().optional(),
    created_at: string(),
    updated_at: string(),
    deleted_at: string().optional(),
  })
  .primaryKey('id');

// Scheduled Date Times
const scheduledDateTime = table('scheduled_date_times')
  .columns({
    id: string(),
    uuid: string(),
    job_id: string(),
    scheduled_at: string(),
    created_at: string(),
    updated_at: string(),
  })
  .primaryKey('id');

// Relationships
const userRelationships = relationships(user, ({ one, many }) => ({
  assignedJobs: many({
    sourceField: ['id'],
    destSchema: jobAssignment,
    destField: ['user_id'],
  }),
  createdNotes: many({
    sourceField: ['id'],
    destSchema: note,
    destField: ['user_id'],
  }),
}));

const clientRelationships = relationships(client, ({ one, many }) => ({
  jobs: many({
    sourceField: ['id'],
    destSchema: job,
    destField: ['client_id'],
  }),
  people: many({
    sourceField: ['id'],
    destSchema: person,
    destField: ['client_id'],
  }),
  devices: many({
    sourceField: ['id'],
    destSchema: device,
    destField: ['client_id'],
  }),
}));

const jobRelationships = relationships(job, ({ one, many }) => ({
  client: one({
    sourceField: ['client_id'],
    destField: ['id'],
    destSchema: client,
  }),
  tasks: many({
    sourceField: ['id'],
    destSchema: task,
    destField: ['job_id'],
  }),
  assignments: many({
    sourceField: ['id'],
    destSchema: jobAssignment,
    destField: ['job_id'],
  }),
  notes: many({
    sourceField: ['id'],
    destSchema: note,
    destField: ['job_id'],
  }),
  scheduledDateTimes: many({
    sourceField: ['id'],
    destSchema: scheduledDateTime,
    destField: ['job_id'],
  }),
}));

const taskRelationships = relationships(task, ({ one, many }) => ({
  job: one({
    sourceField: ['job_id'],
    destField: ['id'],
    destSchema: job,
  }),
  parent: one({
    sourceField: ['parent_id'],
    destField: ['id'],
    destSchema: task,
  }),
  children: many({
    sourceField: ['id'],
    destSchema: task,
    destField: ['parent_id'],
  }),
}));

const jobAssignmentRelationships = relationships(jobAssignment, ({ one }) => ({
  job: one({
    sourceField: ['job_id'],
    destField: ['id'],
    destSchema: job,
  }),
  user: one({
    sourceField: ['user_id'],
    destField: ['id'],
    destSchema: user,
  }),
}));

const personRelationships = relationships(person, ({ one, many }) => ({
  client: one({
    sourceField: ['client_id'],
    destField: ['id'],
    destSchema: client,
  }),
  devices: many({
    sourceField: ['id'],
    destSchema: device,
    destField: ['person_id'],
  }),
}));

const noteRelationships = relationships(note, ({ one }) => ({
  job: one({
    sourceField: ['job_id'],
    destField: ['id'],
    destSchema: job,
  }),
  user: one({
    sourceField: ['user_id'],
    destField: ['id'],
    destSchema: user,
  }),
}));

const deviceRelationships = relationships(device, ({ one }) => ({
  client: one({
    sourceField: ['client_id'],
    destField: ['id'],
    destSchema: client,
  }),
  person: one({
    sourceField: ['person_id'],
    destField: ['id'],
    destSchema: person,
  }),
}));

const scheduledDateTimeRelationships = relationships(scheduledDateTime, ({ one }) => ({
  job: one({
    sourceField: ['job_id'],
    destField: ['id'],
    destSchema: job,
  }),
}));

// Create the complete schema
export const schema = createSchema({
  tables: [
    user,
    client,
    job,
    task,
    jobAssignment,
    person,
    note,
    device,
    scheduledDateTime,
  ],
  relationships: [
    userRelationships,
    clientRelationships,
    jobRelationships,
    taskRelationships,
    jobAssignmentRelationships,
    personRelationships,
    noteRelationships,
    deviceRelationships,
    scheduledDateTimeRelationships,
  ],
});

// Export typed Zero client
export type ZeroClient = Zero<typeof schema>;