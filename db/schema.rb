# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_08_01_190340) do
  create_schema "zero"
  create_schema "zero_0"
  create_schema "zero_0/cdc"

  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "activity_logs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "action"
    t.string "loggable_type", null: false
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.uuid "client_id"
    t.uuid "job_id"
    t.uuid "loggable_id"
    t.index [ "action", "loggable_type", "loggable_id" ], name: "index_activity_logs_on_action_and_loggable"
    t.index [ "client_id" ], name: "index_activity_logs_on_client_id"
    t.index [ "created_at" ], name: "index_activity_logs_on_created_at"
    t.index [ "id" ], name: "index_activity_logs_on_id", unique: true
    t.index [ "job_id" ], name: "index_activity_logs_on_job_id"
    t.index [ "loggable_id" ], name: "index_activity_logs_on_loggable_id"
    t.index [ "loggable_type", "loggable_id", "action" ], name: "index_activity_logs_on_loggable_and_action"
    t.index [ "loggable_type", "loggable_id" ], name: "index_activity_logs_on_loggable_type_and_uuid"
    t.index [ "user_id" ], name: "index_activity_logs_on_user_id"
  end

  create_table "clients", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name_normalized"
    t.string "client_type", null: false
    t.index [ "id" ], name: "index_clients_on_id", unique: true
    t.index [ "name_normalized" ], name: "index_clients_on_name_normalized", unique: true
  end

  create_table "contact_methods", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "value"
    t.string "formatted_value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "person_id"
    t.string "contact_type", null: false
    t.index [ "id" ], name: "index_contact_methods_on_id", unique: true
    t.index [ "person_id" ], name: "index_contact_methods_on_person_id"
  end

  create_table "devices", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.string "model"
    t.string "serial_number"
    t.string "location"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "client_id"
    t.uuid "person_id"
    t.index [ "client_id" ], name: "index_devices_on_client_id"
    t.index [ "id" ], name: "index_devices_on_id", unique: true
    t.index [ "person_id" ], name: "index_devices_on_person_id"
  end

  create_table "job_assignments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "job_id"
    t.uuid "user_id"
    t.index [ "id" ], name: "index_job_assignments_on_id", unique: true
    t.index [ "job_id" ], name: "index_job_assignments_on_job_id"
    t.index [ "user_id" ], name: "index_job_assignments_on_user_id"
  end

  create_table "job_people", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "job_id"
    t.uuid "person_id"
    t.index [ "id" ], name: "index_job_people_on_id", unique: true
    t.index [ "job_id" ], name: "index_job_people_on_job_id"
    t.index [ "person_id" ], name: "index_job_people_on_person_id"
  end

  create_table "job_targets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "target_type", null: false
    t.string "status", default: "active"
    t.integer "instance_number", default: 1, null: false
    t.string "reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "job_id"
    t.uuid "target_id"
    t.index [ "id" ], name: "index_job_targets_on_id", unique: true
    t.index [ "job_id" ], name: "index_job_targets_on_job_id"
    t.index [ "status" ], name: "index_job_targets_on_status"
    t.index [ "target_id" ], name: "index_job_targets_on_target_id"
    t.index [ "target_type", "target_id" ], name: "index_job_targets_on_target_type_and_uuid"
  end

  create_table "jobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "title"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.integer "lock_version", default: 0, null: false
    t.uuid "client_id"
    t.datetime "due_at", precision: nil
    t.boolean "due_time_set", default: false, null: false
    t.datetime "starts_at", precision: nil
    t.boolean "start_time_set", default: false, null: false
    t.string "status", default: "open", null: false
    t.string "priority", default: "normal", null: false
    t.index [ "client_id" ], name: "index_jobs_on_client_id"
    t.index [ "id" ], name: "index_jobs_on_id", unique: true
    t.index [ "lock_version" ], name: "index_jobs_on_lock_version"
  end

  create_table "notes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "notable_type", null: false
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "metadata"
    t.uuid "user_id"
    t.uuid "notable_id"
    t.index [ "id" ], name: "index_notes_on_id", unique: true
    t.index [ "notable_id" ], name: "index_notes_on_notable_id"
    t.index [ "notable_type", "notable_id" ], name: "index_notes_on_notable_type_and_uuid"
    t.index [ "user_id" ], name: "index_notes_on_user_id"
  end

  create_table "people", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "client_id"
    t.string "name_preferred"
    t.string "name_pronunciation_hint"
    t.boolean "is_active", default: true
    t.index [ "client_id" ], name: "index_people_on_client_id"
    t.index [ "id" ], name: "index_people_on_id", unique: true
  end

  create_table "refresh_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "jti", null: false
    t.string "family_id", null: false
    t.datetime "expires_at", null: false
    t.string "device_fingerprint"
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index [ "family_id" ], name: "index_refresh_tokens_on_family_id"
    t.index [ "id" ], name: "index_refresh_tokens_on_id", unique: true
    t.index [ "jti" ], name: "index_refresh_tokens_on_jti", unique: true
    t.index [ "user_id" ], name: "index_refresh_tokens_on_user_id"
  end

  create_table "revoked_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "jti", null: false
    t.bigint "user_id", null: false
    t.string "user_uuid", null: false
    t.datetime "revoked_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index [ "expires_at" ], name: "index_revoked_tokens_on_expires_at"
    t.index [ "jti" ], name: "index_revoked_tokens_on_jti", unique: true
    t.index [ "user_id" ], name: "index_revoked_tokens_on_user_id"
    t.index [ "user_uuid" ], name: "index_revoked_tokens_on_user_uuid"
  end

  create_table "scheduled_date_time_users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "scheduled_date_time_id"
    t.uuid "user_id"
    t.index [ "id" ], name: "index_scheduled_date_time_users_on_id", unique: true
    t.index [ "scheduled_date_time_id" ], name: "index_scheduled_date_time_users_on_scheduled_date_time_id"
    t.index [ "user_id" ], name: "index_scheduled_date_time_users_on_user_id"
  end

  create_table "scheduled_date_times", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "schedulable_type", null: false
    t.string "scheduled_type", null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "schedulable_id"
    t.datetime "scheduled_at", precision: nil
    t.boolean "scheduled_time_set", default: false, null: false
    t.index [ "id" ], name: "index_scheduled_date_times_on_id", unique: true
    t.index [ "schedulable_id" ], name: "index_scheduled_date_times_on_schedulable_id"
    t.index [ "schedulable_type", "schedulable_id" ], name: "index_scheduled_date_times_on_schedulable_type_and_uuid"
    t.index [ "scheduled_type" ], name: "index_scheduled_date_times_on_scheduled_type"
  end

  create_table "solid_cable_messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.index [ "channel" ], name: "index_solid_cable_messages_on_channel"
    t.index [ "channel_hash" ], name: "index_solid_cable_messages_on_channel_hash"
    t.index [ "created_at" ], name: "index_solid_cable_messages_on_created_at"
    t.index [ "id" ], name: "index_solid_cable_messages_on_id", unique: true
  end

  create_table "solid_cache_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.binary "key", null: false
    t.binary "value", null: false
    t.datetime "created_at", null: false
    t.bigint "key_hash", null: false
    t.integer "byte_size", null: false
    t.index [ "byte_size" ], name: "index_solid_cache_entries_on_byte_size"
    t.index [ "id" ], name: "index_solid_cache_entries_on_id", unique: true
    t.index [ "key_hash", "byte_size" ], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index [ "key_hash" ], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_blocked_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index [ "concurrency_key", "priority", "job_id" ], name: "index_solid_queue_blocked_executions_for_release"
    t.index [ "expires_at", "concurrency_key" ], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index [ "id" ], name: "index_solid_queue_blocked_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_claimed_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index [ "process_id", "job_id" ], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_failed_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index [ "active_job_id" ], name: "index_solid_queue_jobs_on_active_job_id"
    t.index [ "class_name" ], name: "index_solid_queue_jobs_on_class_name"
    t.index [ "finished_at" ], name: "index_solid_queue_jobs_on_finished_at"
    t.index [ "id" ], name: "index_solid_queue_jobs_on_id", unique: true
    t.index [ "queue_name", "finished_at" ], name: "index_solid_queue_jobs_for_filtering"
    t.index [ "scheduled_at", "finished_at" ], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_pauses_on_id", unique: true
    t.index [ "queue_name" ], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index [ "id" ], name: "index_solid_queue_processes_on_id", unique: true
    t.index [ "last_heartbeat_at" ], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index [ "name", "supervisor_id" ], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index [ "supervisor_id" ], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_ready_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index [ "priority", "job_id" ], name: "index_solid_queue_poll_all"
    t.index [ "queue_name", "priority", "job_id" ], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_recurring_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index [ "task_key", "run_at" ], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index [ "id" ], name: "index_solid_queue_recurring_tasks_on_id", unique: true
    t.index [ "key" ], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index [ "static" ], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index [ "id" ], name: "index_solid_queue_scheduled_executions_on_id", unique: true
    t.index [ "job_id" ], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index [ "scheduled_at", "priority", "job_id" ], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index [ "expires_at" ], name: "index_solid_queue_semaphores_on_expires_at"
    t.index [ "id" ], name: "index_solid_queue_semaphores_on_id", unique: true
    t.index [ "key", "value" ], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index [ "key" ], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "tasks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "title"
    t.integer "position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "subtasks_count", default: 0
    t.datetime "reordered_at", default: -> { "CURRENT_TIMESTAMP" }
    t.integer "lock_version", default: 0, null: false
    t.boolean "applies_to_all_targets", default: true, null: false
    t.uuid "job_id"
    t.uuid "assigned_to_id"
    t.uuid "parent_id"
    t.datetime "discarded_at"
    t.string "status", null: false
    t.uuid "repositioned_after_id"
    t.boolean "position_finalized", default: false, null: false
    t.boolean "repositioned_to_top", default: false, null: false
    t.index [ "assigned_to_id" ], name: "index_tasks_on_assigned_to_id"
    t.index [ "discarded_at" ], name: "index_tasks_on_discarded_at"
    t.index [ "id" ], name: "index_tasks_on_id", unique: true
    t.index [ "job_id", "parent_id", "position" ], name: "index_tasks_on_scope_and_position_non_unique"
    t.index [ "job_id" ], name: "index_tasks_on_job_id"
    t.index [ "lock_version" ], name: "index_tasks_on_lock_version"
    t.index [ "parent_id" ], name: "index_tasks_on_parent_id"
    t.index [ "reordered_at" ], name: "index_tasks_on_reordered_at"
    t.index [ "repositioned_after_id" ], name: "index_tasks_on_repositioned_after_id"
  end

  create_table "unique_ids", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "prefix"
    t.string "suffix"
    t.integer "minimum_length", default: 5
    t.boolean "use_checksum", default: true
    t.string "generated_id", null: false
    t.string "identifiable_type"
    t.bigint "identifiable_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index [ "generated_id" ], name: "index_unique_ids_on_generated_id", unique: true
    t.index [ "id" ], name: "index_unique_ids_on_id", unique: true
    t.index [ "identifiable_type", "identifiable_id" ], name: "index_unique_ids_on_identifiable"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "password_digest"
    t.boolean "resort_tasks_on_status_change", default: true, null: false
    t.string "role", null: false
    t.index [ "email" ], name: "index_users_on_email"
    t.index [ "id" ], name: "index_users_on_id", unique: true
  end

  create_table "versions", force: :cascade do |t|
    t.string "whodunnit"
    t.datetime "created_at"
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.string "event", null: false
    t.text "object"
    t.index [ "item_type", "item_id" ], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "activity_logs", "clients"
  add_foreign_key "activity_logs", "jobs"
  add_foreign_key "activity_logs", "users"
  add_foreign_key "contact_methods", "people"
  add_foreign_key "devices", "clients"
  add_foreign_key "devices", "people"
  add_foreign_key "job_assignments", "jobs"
  add_foreign_key "job_assignments", "users"
  add_foreign_key "job_people", "jobs"
  add_foreign_key "job_people", "people"
  add_foreign_key "job_targets", "jobs"
  add_foreign_key "jobs", "clients"
  add_foreign_key "notes", "users"
  add_foreign_key "people", "clients"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "scheduled_date_time_users", "scheduled_date_times"
  add_foreign_key "scheduled_date_time_users", "users"
  add_foreign_key "tasks", "jobs"
  add_foreign_key "tasks", "tasks", column: "parent_id"
  add_foreign_key "tasks", "tasks", column: "repositioned_after_id"
  add_foreign_key "tasks", "users", column: "assigned_to_id"
end
