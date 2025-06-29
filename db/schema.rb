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

ActiveRecord::Schema[8.0].define(version: 2025_06_29_125703) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "activity_logs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "action"
    t.string "loggable_type", null: false
    t.bigint "loggable_id", null: false
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "client_id"
    t.bigint "job_id"
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "user_uuid"
    t.uuid "client_uuid"
    t.uuid "job_uuid"
    t.index ["client_id", "created_at"], name: "index_activity_logs_on_client_id_and_created_at"
    t.index ["client_id", "job_id"], name: "index_activity_logs_on_client_id_and_job_id"
    t.index ["client_id"], name: "index_activity_logs_on_client_id"
    t.index ["client_uuid"], name: "index_activity_logs_on_client_uuid"
    t.index ["job_id"], name: "index_activity_logs_on_job_id"
    t.index ["job_uuid"], name: "index_activity_logs_on_job_uuid"
    t.index ["loggable_type", "loggable_id"], name: "index_activity_logs_on_loggable"
    t.index ["user_id"], name: "index_activity_logs_on_user_id"
    t.index ["user_uuid"], name: "index_activity_logs_on_user_uuid"
    t.index ["uuid"], name: "index_activity_logs_on_uuid", unique: true
  end

  create_table "clients", force: :cascade do |t|
    t.string "name"
    t.string "client_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name_normalized"
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["name_normalized"], name: "index_clients_on_name_normalized", unique: true
    t.index ["uuid"], name: "index_clients_on_uuid", unique: true
  end

  create_table "contact_methods", force: :cascade do |t|
    t.bigint "person_id", null: false
    t.string "value"
    t.string "formatted_value"
    t.integer "contact_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "person_uuid"
    t.index ["person_id"], name: "index_contact_methods_on_person_id"
    t.index ["person_uuid"], name: "index_contact_methods_on_person_uuid"
    t.index ["uuid"], name: "index_contact_methods_on_uuid", unique: true
  end

  create_table "devices", force: :cascade do |t|
    t.bigint "person_id"
    t.string "name"
    t.string "model"
    t.string "serial_number"
    t.string "location"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "client_id", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "client_uuid"
    t.uuid "person_uuid"
    t.index ["client_id", "name"], name: "index_devices_on_client_id_and_name", unique: true
    t.index ["client_id"], name: "index_devices_on_client_id"
    t.index ["client_uuid"], name: "index_devices_on_client_uuid"
    t.index ["person_id"], name: "index_devices_on_person_id"
    t.index ["person_uuid"], name: "index_devices_on_person_uuid"
    t.index ["uuid"], name: "index_devices_on_uuid", unique: true
  end

  create_table "job_assignments", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "job_uuid"
    t.uuid "user_uuid"
    t.index ["job_id"], name: "index_job_assignments_on_job_id"
    t.index ["job_uuid"], name: "index_job_assignments_on_job_uuid"
    t.index ["user_id"], name: "index_job_assignments_on_user_id"
    t.index ["user_uuid"], name: "index_job_assignments_on_user_uuid"
    t.index ["uuid"], name: "index_job_assignments_on_uuid", unique: true
  end

  create_table "job_people", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "person_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "job_uuid"
    t.uuid "person_uuid"
    t.index ["job_id"], name: "index_job_people_on_job_id"
    t.index ["job_uuid"], name: "index_job_people_on_job_uuid"
    t.index ["person_id"], name: "index_job_people_on_person_id"
    t.index ["person_uuid"], name: "index_job_people_on_person_uuid"
    t.index ["uuid"], name: "index_job_people_on_uuid", unique: true
  end

  create_table "job_targets", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "target_type", null: false
    t.bigint "target_id", null: false
    t.string "status", default: "active"
    t.integer "instance_number", default: 1, null: false
    t.string "reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "job_uuid"
    t.index ["job_id", "target_type", "target_id", "instance_number"], name: "index_job_targets_uniqueness", unique: true
    t.index ["job_id"], name: "index_job_targets_on_job_id"
    t.index ["job_uuid"], name: "index_job_targets_on_job_uuid"
    t.index ["status"], name: "index_job_targets_on_status"
    t.index ["target_type", "target_id"], name: "index_job_targets_on_target_type_and_target_id"
    t.index ["uuid"], name: "index_job_targets_on_uuid", unique: true
  end

  create_table "jobs", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "title"
    t.integer "status"
    t.integer "priority"
    t.datetime "due_date"
    t.datetime "start_on_date"
    t.bigint "created_by_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.date "due_on"
    t.time "due_time"
    t.date "start_on"
    t.time "start_time"
    t.integer "lock_version", default: 0, null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "client_uuid"
    t.uuid "created_by_uuid"
    t.index ["client_id"], name: "index_jobs_on_client_id"
    t.index ["client_uuid"], name: "index_jobs_on_client_uuid"
    t.index ["created_by_id"], name: "index_jobs_on_created_by_id"
    t.index ["created_by_uuid"], name: "index_jobs_on_created_by_uuid"
    t.index ["lock_version"], name: "index_jobs_on_lock_version"
    t.index ["uuid"], name: "index_jobs_on_uuid", unique: true
  end

  create_table "notes", force: :cascade do |t|
    t.string "notable_type", null: false
    t.bigint "notable_id", null: false
    t.bigint "user_id", null: false
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "metadata"
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "user_uuid"
    t.index ["notable_type", "notable_id"], name: "index_notes_on_notable"
    t.index ["user_id"], name: "index_notes_on_user_id"
    t.index ["user_uuid"], name: "index_notes_on_user_uuid"
    t.index ["uuid"], name: "index_notes_on_uuid", unique: true
  end

  create_table "people", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "name"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "client_uuid"
    t.index ["client_id"], name: "index_people_on_client_id"
    t.index ["client_uuid"], name: "index_people_on_client_uuid"
    t.index ["uuid"], name: "index_people_on_uuid", unique: true
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "jti", null: false
    t.string "family_id", null: false
    t.datetime "expires_at", null: false
    t.string "device_fingerprint"
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "user_uuid"
    t.index ["family_id"], name: "index_refresh_tokens_on_family_id"
    t.index ["jti"], name: "index_refresh_tokens_on_jti", unique: true
    t.index ["user_id", "family_id"], name: "index_refresh_tokens_on_user_id_and_family_id"
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
    t.index ["user_uuid"], name: "index_refresh_tokens_on_user_uuid"
    t.index ["uuid"], name: "index_refresh_tokens_on_uuid", unique: true
  end

  create_table "revoked_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "jti", null: false
    t.bigint "user_id", null: false
    t.string "user_uuid", null: false
    t.datetime "revoked_at", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_revoked_tokens_on_expires_at"
    t.index ["jti"], name: "index_revoked_tokens_on_jti", unique: true
    t.index ["user_id"], name: "index_revoked_tokens_on_user_id"
    t.index ["user_uuid"], name: "index_revoked_tokens_on_user_uuid"
  end

  create_table "scheduled_date_time_users", force: :cascade do |t|
    t.bigint "scheduled_date_time_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "scheduled_date_time_uuid"
    t.uuid "user_uuid"
    t.index ["scheduled_date_time_id", "user_id"], name: "index_scheduled_date_time_users_unique", unique: true
    t.index ["scheduled_date_time_id"], name: "index_scheduled_date_time_users_on_scheduled_date_time_id"
    t.index ["scheduled_date_time_uuid"], name: "index_scheduled_date_time_users_on_scheduled_date_time_uuid"
    t.index ["user_id"], name: "index_scheduled_date_time_users_on_user_id"
    t.index ["user_uuid"], name: "index_scheduled_date_time_users_on_user_uuid"
    t.index ["uuid"], name: "index_scheduled_date_time_users_on_uuid", unique: true
  end

  create_table "scheduled_date_times", force: :cascade do |t|
    t.string "schedulable_type", null: false
    t.bigint "schedulable_id", null: false
    t.string "scheduled_type", null: false
    t.date "scheduled_date", null: false
    t.time "scheduled_time"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["schedulable_type", "schedulable_id", "scheduled_type"], name: "index_scheduled_date_times_on_schedulable_and_type"
    t.index ["schedulable_type", "schedulable_id"], name: "index_scheduled_date_times_on_schedulable"
    t.index ["scheduled_date"], name: "index_scheduled_date_times_on_scheduled_date"
    t.index ["scheduled_type"], name: "index_scheduled_date_times_on_scheduled_type"
    t.index ["uuid"], name: "index_scheduled_date_times_on_uuid", unique: true
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
    t.index ["uuid"], name: "index_solid_cable_messages_on_uuid", unique: true
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.binary "key", null: false
    t.binary "value", null: false
    t.datetime "created_at", null: false
    t.bigint "key_hash", null: false
    t.integer "byte_size", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
    t.index ["uuid"], name: "index_solid_cache_entries_on_uuid", unique: true
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
    t.index ["uuid"], name: "index_solid_queue_blocked_executions_on_uuid", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
    t.index ["uuid"], name: "index_solid_queue_claimed_executions_on_uuid", unique: true
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
    t.index ["uuid"], name: "index_solid_queue_failed_executions_on_uuid", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
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
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
    t.index ["uuid"], name: "index_solid_queue_jobs_on_uuid", unique: true
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
    t.index ["uuid"], name: "index_solid_queue_pauses_on_uuid", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
    t.index ["uuid"], name: "index_solid_queue_processes_on_uuid", unique: true
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
    t.index ["uuid"], name: "index_solid_queue_ready_executions_on_uuid", unique: true
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
    t.index ["uuid"], name: "index_solid_queue_recurring_executions_on_uuid", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
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
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
    t.index ["uuid"], name: "index_solid_queue_recurring_tasks_on_uuid", unique: true
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
    t.index ["uuid"], name: "index_solid_queue_scheduled_executions_on_uuid", unique: true
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
    t.index ["uuid"], name: "index_solid_queue_semaphores_on_uuid", unique: true
  end

  create_table "task_completions", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "job_target_id", null: false
    t.string "status", default: "new_task", null: false
    t.datetime "completed_at"
    t.bigint "completed_by_id"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "task_uuid"
    t.uuid "job_target_uuid"
    t.uuid "completed_by_uuid"
    t.index ["completed_by_id"], name: "index_task_completions_on_completed_by_id"
    t.index ["completed_by_uuid"], name: "index_task_completions_on_completed_by_uuid"
    t.index ["job_target_id"], name: "index_task_completions_on_job_target_id"
    t.index ["job_target_uuid"], name: "index_task_completions_on_job_target_uuid"
    t.index ["status"], name: "index_task_completions_on_status"
    t.index ["task_id", "job_target_id"], name: "index_task_completions_on_task_id_and_job_target_id", unique: true
    t.index ["task_id"], name: "index_task_completions_on_task_id"
    t.index ["task_uuid"], name: "index_task_completions_on_task_uuid"
    t.index ["uuid"], name: "index_task_completions_on_uuid", unique: true
  end

  create_table "tasks", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "title"
    t.integer "status"
    t.integer "position"
    t.bigint "assigned_to_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "parent_id"
    t.integer "subtasks_count", default: 0
    t.datetime "reordered_at", default: -> { "CURRENT_TIMESTAMP" }
    t.integer "lock_version", default: 0, null: false
    t.boolean "applies_to_all_targets", default: true, null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.uuid "job_uuid"
    t.uuid "assigned_to_uuid"
    t.uuid "parent_uuid"
    t.index ["assigned_to_id"], name: "index_tasks_on_assigned_to_id"
    t.index ["assigned_to_uuid"], name: "index_tasks_on_assigned_to_uuid"
    t.index ["job_id"], name: "index_tasks_on_job_id"
    t.index ["job_uuid"], name: "index_tasks_on_job_uuid"
    t.index ["lock_version"], name: "index_tasks_on_lock_version"
    t.index ["parent_id"], name: "index_tasks_on_parent_id"
    t.index ["parent_uuid"], name: "index_tasks_on_parent_uuid"
    t.index ["reordered_at"], name: "index_tasks_on_reordered_at"
    t.index ["uuid"], name: "index_tasks_on_uuid", unique: true
  end

  create_table "unique_ids", force: :cascade do |t|
    t.string "prefix"
    t.string "suffix"
    t.integer "minimum_length", default: 5
    t.boolean "use_checksum", default: true
    t.string "generated_id", null: false
    t.string "identifiable_type"
    t.bigint "identifiable_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["generated_id"], name: "index_unique_ids_on_generated_id", unique: true
    t.index ["identifiable_type", "identifiable_id"], name: "index_unique_ids_on_identifiable"
    t.index ["uuid"], name: "index_unique_ids_on_uuid", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.integer "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "password_digest"
    t.boolean "resort_tasks_on_status_change", default: true, null: false
    t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
    t.index ["uuid"], name: "index_users_on_uuid", unique: true
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
  add_foreign_key "jobs", "users", column: "created_by_id"
  add_foreign_key "notes", "users"
  add_foreign_key "people", "clients"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "revoked_tokens", "users"
  add_foreign_key "scheduled_date_time_users", "scheduled_date_times"
  add_foreign_key "scheduled_date_time_users", "users"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "task_completions", "job_targets"
  add_foreign_key "task_completions", "tasks"
  add_foreign_key "task_completions", "users", column: "completed_by_id"
  add_foreign_key "tasks", "jobs"
  add_foreign_key "tasks", "tasks", column: "parent_id"
  add_foreign_key "tasks", "users", column: "assigned_to_id"
end
