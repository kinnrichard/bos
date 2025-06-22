class DevicesController < ApplicationController
  before_action :set_client
  before_action :set_device, only: [:show, :edit, :update, :destroy]
  
  def index
    @devices = @client.devices.includes(:person).order(:name)
    render Views::Devices::IndexView.new(client: @client, devices: @devices, current_user: current_user)
  end
  
  def show
    render Views::Devices::ShowView.new(client: @client, device: @device, current_user: current_user)
  end
  
  def new
    @device = @client.devices.build
    @people = @client.people.order(:name)
    render Views::Devices::NewView.new(client: @client, device: @device, people: @people, current_user: current_user)
  end
  
  def create
    @device = @client.devices.build(device_params)
    
    if @device.save
      ActivityLog.create!(
        user: current_user,
        action: 'created',
        loggable: @device,
        metadata: { device_name: @device.name, client_name: @client.name }
      )
      redirect_to client_device_path(@client, @device), notice: 'Device was successfully created.'
    else
      @people = @client.people.order(:name)
      render Views::Devices::NewView.new(client: @client, device: @device, people: @people, current_user: current_user), status: :unprocessable_entity
    end
  end
  
  def edit
    @people = @client.people.order(:name)
    render Views::Devices::EditView.new(client: @client, device: @device, people: @people, current_user: current_user)
  end
  
  def update
    if @device.update(device_params)
      ActivityLog.create!(
        user: current_user,
        action: 'updated',
        loggable: @device,
        metadata: { device_name: @device.name, client_name: @client.name }
      )
      redirect_to client_device_path(@client, @device), notice: 'Device was successfully updated.'
    else
      @people = @client.people.order(:name)
      render Views::Devices::EditView.new(client: @client, device: @device, people: @people, current_user: current_user), status: :unprocessable_entity
    end
  end
  
  def destroy
    # Only owners can delete devices
    unless current_user.can_delete?(@device)
      redirect_to client_devices_path(@client), alert: 'You do not have permission to delete this device.'
      return
    end
    
    device_name = @device.name
    @device.destroy
    
    ActivityLog.create!(
      user: current_user,
      action: 'deleted',
      loggable_type: 'Device',
      loggable_id: @device.id,
      metadata: { device_name: device_name, client_name: @client.name }
    )
    
    redirect_to client_devices_path(@client), notice: 'Device was successfully deleted.'
  end
  
  private
  
  def set_client
    @client = Client.find(params[:client_id])
  end
  
  def set_device
    @device = @client.devices.find(params[:id])
  end
  
  def device_params
    params.require(:device).permit(:name, :location, :person_id, :notes)
  end
end
