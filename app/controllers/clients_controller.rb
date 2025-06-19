class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :edit, :update, :destroy]
  
  def index
    @clients = Client.search(params[:q])
    @current_user = OpenStruct.new(name: "Oliver Chen")
    render Views::Clients::IndexView.new(clients: @clients, current_user: @current_user)
  end
  
  def search
    @query = params[:q]
    @clients = Client.search(@query).limit(10)
    @current_user = OpenStruct.new(name: "Oliver Chen")
    
    respond_to do |format|
      format.html { render Views::Clients::SearchResultsView.new(clients: @clients, query: @query) }
      format.json { render json: @clients }
    end
  end
  
  def new
    @client = Client.new(name: format_name(params[:name]))
    @current_user = OpenStruct.new(name: "Oliver Chen")
    render Views::Clients::NewView.new(
      client: @client, 
      current_user: @current_user,
      authenticity_token: form_authenticity_token
    )
  end
  
  def create
    @client = Client.new(client_params)
    @current_user = OpenStruct.new(name: "Oliver Chen")
    
    if @client.save
      redirect_to client_path(@client), notice: "Client created successfully."
    else
      render Views::Clients::NewView.new(client: @client, current_user: @current_user)
    end
  end
  
  def show
    @current_user = OpenStruct.new(name: "Oliver Chen")
    render Views::Clients::ShowView.new(client: @client, current_user: @current_user)
  end
  
  def edit
    @current_user = OpenStruct.new(name: "Oliver Chen")
    render Views::Clients::EditView.new(
      client: @client, 
      current_user: @current_user,
      authenticity_token: form_authenticity_token
    )
  end
  
  def update
    @current_user = OpenStruct.new(name: "Oliver Chen")
    
    if @client.update(client_params)
      redirect_to client_path(@client), notice: "Client updated successfully."
    else
      render Views::Clients::EditView.new(client: @client, current_user: @current_user)
    end
  end
  
  def destroy
    @client.destroy
    redirect_to clients_path, notice: "Client deleted successfully."
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