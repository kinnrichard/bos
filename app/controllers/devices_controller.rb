class DevicesController < ApplicationController
  before_action :set_client
  before_action :set_device, only: [:show, :edit, :update, :destroy]
  
  def index
    @devices = @client.devices.includes(:person).order(:name)
    render Devices::IndexView.new(client: @client, devices: @devices)
  end
  
  def show
    render Devices::ShowView.new(client: @client, device: @device)
  end
  
  def new
    @device = @client.devices.build
    @people = @client.people.order(:name)
    render Devices::NewView.new(client: @client, device: @device, people: @people)
  end
  
  def create
    @device = @client.devices.build(device_params)
    
    if @device.save
      ActivityLog.create!(
        client: @client,
        user: current_user,
        action: 'created',
        resource_type: 'Device',
        resource_id: @device.id,
        details: { device_name: @device.name }
      )
      redirect_to client_device_path(@client, @device), notice: 'Device was successfully created.'
    else
      @people = @client.people.order(:name)
      render Devices::NewView.new(client: @client, device: @device, people: @people), status: :unprocessable_entity
    end
  end
  
  def edit
    @people = @client.people.order(:name)
    render Devices::EditView.new(client: @client, device: @device, people: @people)
  end
  
  def update
    if @device.update(device_params)
      ActivityLog.create!(
        client: @client,
        user: current_user,
        action: 'updated',
        resource_type: 'Device',
        resource_id: @device.id,
        details: { device_name: @device.name }
      )
      redirect_to client_device_path(@client, @device), notice: 'Device was successfully updated.'
    else
      @people = @client.people.order(:name)
      render Devices::EditView.new(client: @client, device: @device, people: @people), status: :unprocessable_entity
    end
  end
  
  def destroy
    # Only superadmins can delete devices
    unless current_user.can_delete?(@device)
      redirect_to client_devices_path(@client), alert: 'You do not have permission to delete this device.'
      return
    end
    
    device_name = @device.name
    @device.destroy
    
    ActivityLog.create!(
      client: @client,
      user: current_user,
      action: 'deleted',
      resource_type: 'Device',
      resource_id: @device.id,
      details: { device_name: device_name }
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
  
  def current_user
    # TODO: Replace with actual current user from authentication
    User.first || User.create!(
      name: 'System User',
      email: 'system@example.com',
      role: :admin
    )
  end
end
