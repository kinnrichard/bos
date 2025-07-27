/**
 * Model Relationships - TypeScript interfaces for all model relationships
 *
 * Defines the shape of loaded relationship data when using includes().
 * These interfaces are used for type safety when accessing relationship data.
 *
 * Generated: 2025-07-14 Epic-009 Phase 2
 */

import type { ClientData } from './client-data';
import type { UserData } from './user-data';
import type { TaskData } from './task-data';
import type { JobData } from './job-data';
import type { ActivityLogData } from './activity-log-data';
import type { JobAssignmentData } from './job-assignment-data';
import type { JobPersonData } from './job-person-data';
import type { JobTargetData } from './job-target-data';
import type { ScheduledDateTimeData } from './scheduled-date-time-data';
import type { PersonData } from './person-data';
import type { DeviceData } from './device-data';
import type { ContactMethodData } from './contact-method-data';
import type { NoteData } from './note-data';
import type { TaskCompletionData } from './task-completion-data';
import type { ScheduledDateTimeUserData } from './scheduled-date-time-user-data';

/**
 * Job model relationships
 * Used when calling: Job.includes('client', 'tasks', ...)
 */
export interface JobRelationships {
  client: ClientData;
  createdBy: UserData;
  jobAssignments: JobAssignmentData[];
  tasks: TaskData[];
  activityLogs: ActivityLogData[];
  jobTargets: JobTargetData[];
  scheduledDateTimes: ScheduledDateTimeData[];
  jobPeople: JobPersonData[];
}

/**
 * Client model relationships
 * Used when calling: Client.includes('jobs', 'people', ...)
 */
export interface ClientRelationships {
  jobs: JobData[];
  people: PersonData[];
  devices: DeviceData[];
  activityLogs: ActivityLogData[];
  contactMethods: ContactMethodData[];
}

/**
 * Task model relationships
 * Used when calling: Task.includes('job', 'assignedTo', ...)
 */
export interface TaskRelationships {
  job: JobData;
  assignedTo: UserData;
  parent: TaskData;
  notes: NoteData[];
  subtasks: TaskData[];
  taskCompletions: TaskCompletionData[];
}

/**
 * User model relationships
 * Used when calling: User.includes('jobAssignments', 'assignedTasks', ...)
 */
export interface UserRelationships {
  jobAssignments: JobAssignmentData[];
  assignedTasks: TaskData[];
  activityLogs: ActivityLogData[];
  createdJobs: JobData[];
  scheduledDateTimeUsers: ScheduledDateTimeUserData[];
}

/**
 * Person model relationships
 * Used when calling: Person.includes('client', 'contactMethods', ...)
 */
export interface PersonRelationships {
  client: ClientData;
  contactMethods: ContactMethodData[];
  devices: DeviceData[];
  jobPeople: JobPersonData[];
}

/**
 * Device model relationships
 * Used when calling: Device.includes('client', 'person', ...)
 */
export interface DeviceRelationships {
  client: ClientData;
  person: PersonData;
}

/**
 * Contact Method model relationships
 * Used when calling: ContactMethod.includes('person', ...)
 */
export interface ContactMethodRelationships {
  person: PersonData;
}

/**
 * Activity Log model relationships
 * Used when calling: ActivityLog.includes('client', 'job', ...)
 */
export interface ActivityLogRelationships {
  client: ClientData;
  job: JobData;
}

/**
 * Job Assignment model relationships
 * Used when calling: JobAssignment.includes('job', 'user', ...)
 */
export interface JobAssignmentRelationships {
  job: JobData;
  user: UserData;
}

/**
 * Job Person model relationships
 * Used when calling: JobPerson.includes('job', 'person', ...)
 */
export interface JobPersonRelationships {
  job: JobData;
  person: PersonData;
}

/**
 * Job Target model relationships
 * Used when calling: JobTarget.includes('job', ...)
 */
export interface JobTargetRelationships {
  job: JobData;
}

/**
 * Note model relationships
 * Used when calling: Note.includes('task', ...)
 */
export interface NoteRelationships {
  task: TaskData;
}

/**
 * Scheduled Date Time model relationships
 * Used when calling: ScheduledDateTime.includes('job', 'scheduledDateTimeUsers', ...)
 */
export interface ScheduledDateTimeRelationships {
  job: JobData;
  scheduledDateTimeUsers: ScheduledDateTimeUserData[];
}

/**
 * Scheduled Date Time User model relationships
 * Used when calling: ScheduledDateTimeUser.includes('scheduledDateTime', 'user', ...)
 */
export interface ScheduledDateTimeUserRelationships {
  scheduledDateTime: ScheduledDateTimeData;
  user: UserData;
}

/**
 * Task Completion model relationships
 * Used when calling: TaskCompletion.includes('task', ...)
 */
export interface TaskCompletionRelationships {
  task: TaskData;
}

/**
 * Utility type to get relationship interface for a model
 * Used internally by the includes() implementation
 */
export type ModelRelationships<T> = T extends JobData
  ? JobRelationships
  : T extends ClientData
    ? ClientRelationships
    : T extends TaskData
      ? TaskRelationships
      : T extends UserData
        ? UserRelationships
        : T extends PersonData
          ? PersonRelationships
          : T extends DeviceData
            ? DeviceRelationships
            : T extends ContactMethodData
              ? ContactMethodRelationships
              : T extends ActivityLogData
                ? ActivityLogRelationships
                : T extends JobAssignmentData
                  ? JobAssignmentRelationships
                  : T extends JobPersonData
                    ? JobPersonRelationships
                    : T extends JobTargetData
                      ? JobTargetRelationships
                      : T extends NoteData
                        ? NoteRelationships
                        : T extends ScheduledDateTimeData
                          ? ScheduledDateTimeRelationships
                          : T extends ScheduledDateTimeUserData
                            ? ScheduledDateTimeUserRelationships
                            : T extends TaskCompletionData
                              ? TaskCompletionRelationships
                              : Record<string, never>;

/**
 * Type-safe includes helper - constrains relationship names to valid ones
 * Used to provide TypeScript autocomplete for relationship names
 */
export type ValidRelationshipNames<T> = keyof ModelRelationships<T>;

/**
 * Type-safe result type when includes() is used
 * Merges the base model data with selected relationship data
 */
export type WithRelationships<T, K extends ValidRelationshipNames<T>> = T &
  Pick<ModelRelationships<T>, K>;
