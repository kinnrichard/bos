class LogsController < ApplicationController
  def index
    @logs = ActivityLog.includes(:user, :client, :job)
                      .recent
                      .where(
                        "action != 'updated' OR metadata->'changes' IS NULL OR jsonb_object_keys(metadata->'changes') != '{position}'"
                      )
                      .limit(500)  # Increased limit for better history view

    render Views::Logs::IndexView.new(logs: @logs, current_user: current_user)
  end
end
