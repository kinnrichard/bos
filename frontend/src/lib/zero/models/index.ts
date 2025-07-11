// Auto-export all model mutations and ActiveRecord-style queries
// Each model includes both .generated.ts (auto-generated) and .custom.ts (user-editable) exports

// User model (createUser, updateUser, User.find, User.all, etc.)
export * from './user.generated';
export * from './user.custom';

// Client model (createClient, updateClient, Client.find, Client.all, etc.)
export * from './client.generated';
export * from './client.custom';

// Job model (createJob, updateJob, Job.find, Job.all, etc.)
export * from './job.generated';
export * from './job.custom';

// Task model (createTask, updateTask, Task.find, Task.all, etc.)
export * from './task.generated';
export * from './task.custom';

// Activity log model
export * from './activity_log.generated';
export * from './activity_log.custom';

// Contact method model
export * from './contact_method.generated';
export * from './contact_method.custom';

// Job target model
export * from './job_target.generated';
export * from './job_target.custom';

// Note model
export * from './note.generated';
export * from './note.custom';

// Scheduled date time model
export * from './scheduled_date_time.generated';
export * from './scheduled_date_time.custom';