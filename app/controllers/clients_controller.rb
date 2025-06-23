class ClientsController < ApplicationController
  before_action :set_client, only: [ :show, :edit, :update, :destroy, :logs ]

  def index
    @clients = Client.search(params[:q])
    render Views::Clients::IndexView.new(clients: @clients, current_user: current_user)
  end

  def search
    @query = params[:q]
    @clients = Client.search(@query).limit(10)

    respond_to do |format|
      format.html { render Views::Clients::SearchResultsView.new(clients: @clients, query: @query) }
      format.json { render json: @clients }
    end
  end

  def new
    @client = Client.new(name: format_name(params[:name]))
    render Views::Clients::NewView.new(
      client: @client,
      current_user: current_user,
      authenticity_token: form_authenticity_token
    )
  end

  def create
    @client = Client.new(client_params)

    if @client.save
      redirect_to client_path(@client), notice: "Client created successfully."
    else
      render Views::Clients::NewView.new(client: @client, current_user: current_user)
    end
  end

  def show
    @client.log_action("viewed", user: current_user)
    render Views::Clients::ShowView.new(client: @client, current_user: current_user)
  end

  def edit
    render Views::Clients::EditView.new(
      client: @client,
      current_user: current_user,
      authenticity_token: form_authenticity_token
    )
  end

  def update
    if @client.update(client_params)
      redirect_to client_path(@client), notice: "Client updated successfully."
    else
      render Views::Clients::EditView.new(client: @client, current_user: current_user)
    end
  end

  def destroy
    @client.destroy
    redirect_to clients_path, notice: "Client deleted successfully."
  end

  def logs
    @logs = ActivityLog.for_client(@client)
                      .includes(:user, :client, :job)
                      .recent
                      .limit(500)
                      .reject { |log| log.action == "updated" && log.metadata["changes"]&.keys == [ "position" ] }

    render Views::Clients::LogsView.new(
      client: @client,
      logs: @logs,
      current_user: current_user
    )
  end

  private

  def set_client
    @client = Client.find(params[:id])
  end

  def client_params
    params.require(:client).permit(:name, :client_type)
  end

  def format_name(name)
    return name if name.blank?

    # If the name is all lowercase, convert to title case
    if name == name.downcase
      name.split.map(&:capitalize).join(" ")
    else
      name
    end
  end
end
