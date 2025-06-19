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

ActiveRecord::Schema[8.0].define(version: 2025_06_19_080723) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "clients", force: :cascade do |t|
    t.string "name"
    t.string "client_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.bigint "person_id", null: false
    t.string "name"
    t.string "model"
    t.string "serial_number"
    t.string "location"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["person_id"], name: "index_devices_on_person_id"
  end

  create_table "people", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.string "name"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_people_on_client_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.integer "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "contact_methods", "people"
  add_foreign_key "devices", "people"
  add_foreign_key "people", "clients"
end
