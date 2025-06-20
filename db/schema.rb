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

ActiveRecord::Schema[8.0].define(version: 2025_06_20_032343) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "activity_logs", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "action"
    t.string "loggable_type", null: false
    t.bigint "loggable_id", null: false
    t.jsonb "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "client_id"
    t.index ["client_id", "created_at"], name: "index_activity_logs_on_client_id_and_created_at"
    t.index ["client_id"], name: "index_activity_logs_on_client_id"
    t.index ["loggable_type", "loggable_id"], name: "index_activity_logs_on_loggable"
    t.index ["user_id"], name: "index_activity_logs_on_user_id"
  end

  create_table "clients", force: :cascade do |t|
    t.string "name"
    t.string "client_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name_normalized"
    t.index ["name_normalized"], name: "index_clients_on_name_normalized", unique: true
  end

  create_table "contact_methods", force: :cascade do |t|
    t.bigint "person_id", null: false
    t.string "value"
    t.string "formatted_value"
    t.integer "contact_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["person_id"], name: "index_contact_methods_on_person_id"
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
    t.index ["client_id", "name"], name: "index_devices_on_client_id_and_name", unique: true
    t.index ["client_id"], name: "index_devices_on_client_id"
    t.index ["person_id"], name: "index_devices_on_person_id"
  end

  create_table "job_assignments", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["job_id"], name: "index_job_assignments_on_job_id"
    t.index ["user_id"], name: "index_job_assignments_on_user_id"
  end

  create_table "job_people", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "person_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["job_id"], name: "index_job_people_on_job_id"
    t.index ["person_id"], name: "index_job_people_on_person_id"
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
    t.index ["client_id"], name: "index_jobs_on_client_id"
    t.index ["created_by_id"], name: "index_jobs_on_created_by_id"
  end

  create_table "notes", force: :cascade do |t|
    t.string "notable_type", null: false
    t.bigint "notable_id", null: false
    t.bigint "user_id", null: false
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["notable_type", "notable_id"], name: "index_notes_on_notable"
    t.index ["user_id"], name: "index_notes_on_user_id"
  end

  create_table "people", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "name"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_people_on_client_id"
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
    t.index ["assigned_to_id"], name: "index_tasks_on_assigned_to_id"
    t.index ["job_id"], name: "index_tasks_on_job_id"
    t.index ["parent_id"], name: "index_tasks_on_parent_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.integer "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "password_digest"
  end

  add_foreign_key "activity_logs", "clients"
  add_foreign_key "activity_logs", "users"
  add_foreign_key "contact_methods", "people"
  add_foreign_key "devices", "clients"
  add_foreign_key "devices", "people"
  add_foreign_key "job_assignments", "jobs"
  add_foreign_key "job_assignments", "users"
  add_foreign_key "job_people", "jobs"
  add_foreign_key "job_people", "people"
  add_foreign_key "jobs", "clients"
  add_foreign_key "jobs", "users", column: "created_by_id"
  add_foreign_key "notes", "users"
  add_foreign_key "people", "clients"
  add_foreign_key "tasks", "jobs"
  add_foreign_key "tasks", "tasks", column: "parent_id"
  add_foreign_key "tasks", "users", column: "assigned_to_id"
end
