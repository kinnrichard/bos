class FixSolidQueueProcessIdTypes < ActiveRecord::Migration[8.0]
  def up
    # Remove foreign key constraints first
    remove_foreign_key :solid_queue_claimed_executions, :solid_queue_processes, column: :process_id if foreign_key_exists?(:solid_queue_claimed_executions, :solid_queue_processes, column: :process_id)

    # Remove indexes that depend on the columns
    remove_index :solid_queue_claimed_executions, [ :process_id, :job_id ] if index_exists?(:solid_queue_claimed_executions, [ :process_id, :job_id ])
    remove_index :solid_queue_processes, :supervisor_id if index_exists?(:solid_queue_processes, :supervisor_id)
    remove_index :solid_queue_processes, [ :name, :supervisor_id ] if index_exists?(:solid_queue_processes, [ :name, :supervisor_id ])

    # Since the tables are likely empty (job queue isn't working), we can safely change the column types
    # First, drop the old columns
    remove_column :solid_queue_claimed_executions, :process_id
    remove_column :solid_queue_processes, :supervisor_id

    # Add them back as UUID columns
    add_column :solid_queue_claimed_executions, :process_id, :uuid
    add_column :solid_queue_processes, :supervisor_id, :uuid

    # Re-add the indexes
    add_index :solid_queue_claimed_executions, [ :process_id, :job_id ], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
    add_index :solid_queue_processes, :supervisor_id, name: "index_solid_queue_processes_on_supervisor_id"
    add_index :solid_queue_processes, [ :name, :supervisor_id ], unique: true, name: "index_solid_queue_processes_on_name_and_supervisor_id"

    # Re-add foreign key if needed (though it might not be necessary for SolidQueue)
    # add_foreign_key :solid_queue_claimed_executions, :solid_queue_processes, column: :process_id
  end

  def down
    # Remove indexes
    remove_index :solid_queue_claimed_executions, [ :process_id, :job_id ] if index_exists?(:solid_queue_claimed_executions, [ :process_id, :job_id ])
    remove_index :solid_queue_processes, :supervisor_id if index_exists?(:solid_queue_processes, :supervisor_id)
    remove_index :solid_queue_processes, [ :name, :supervisor_id ] if index_exists?(:solid_queue_processes, [ :name, :supervisor_id ])

    # Drop UUID columns
    remove_column :solid_queue_claimed_executions, :process_id
    remove_column :solid_queue_processes, :supervisor_id

    # Add them back as bigint columns
    add_column :solid_queue_claimed_executions, :process_id, :bigint
    add_column :solid_queue_processes, :supervisor_id, :bigint

    # Re-add original indexes
    add_index :solid_queue_claimed_executions, [ :process_id, :job_id ], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
    add_index :solid_queue_processes, :supervisor_id, name: "index_solid_queue_processes_on_supervisor_id"
    add_index :solid_queue_processes, [ :name, :supervisor_id ], unique: true, name: "index_solid_queue_processes_on_name_and_supervisor_id"
  end
end
