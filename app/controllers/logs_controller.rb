class LogsController < ApplicationController
  def index
    @logs = ActivityLog.includes(:user, :loggable)
                      .recent
                      .limit(100)
    
    render Views::Logs::IndexView.new(logs: @logs, current_user: current_user)
  end
end