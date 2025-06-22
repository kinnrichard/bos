class LogsController < ApplicationController
  def index
    @logs = ActivityLog.includes(:user)
                      .recent
                      .where.not(action: "updated", metadata: { changes: { position: [] } })
                      .limit(100)
                      .reject { |log| log.action == "updated" && log.metadata["changes"]&.keys == [ "position" ] }

    render Views::Logs::IndexView.new(logs: @logs, current_user: current_user)
  end
end
