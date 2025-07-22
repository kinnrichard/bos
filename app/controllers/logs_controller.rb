class LogsController < ApplicationController
  def index
    @logs = ActivityLog.includes(:user, :client, :job)
                      .recent
                      .where(
                        "action != 'updated' OR metadata->'changes' IS NULL OR jsonb_object_keys(metadata->'changes') != '{position}'"
                      )

    render Views::Logs::IndexView.new(logs: @logs, current_user: current_user)
  end
end
