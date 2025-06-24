class PeopleController < ApplicationController
  before_action :set_client
  before_action :set_person, only: [ :show, :edit, :update, :destroy ]

  def index
    @people = @client.people.includes(:contact_methods)
    render Views::People::IndexView.new(
      client: @client,
      people: @people,
      current_user: current_user
    )
  end

  def show
    render Views::People::ShowView.new(
      client: @client,
      person: @person,
      current_user: current_user
    )
  end

  def new
    @person = @client.people.build
    render Views::People::NewView.new(
      client: @client,
      person: @person,
      current_user: current_user,
      authenticity_token: form_authenticity_token
    )
  end

  def create
    @person = @client.people.build(person_params)

    if @person.save
      # Log the action
      ActivityLog.create!(
        user: current_user,
        action: "created",
        loggable: @person,
        metadata: { client_name: @client.name }
      )

      redirect_to client_person_path(@client, @person), notice: "Person created successfully."
    else
      render Views::People::NewView.new(
        client: @client,
        person: @person,
        current_user: current_user,
        authenticity_token: form_authenticity_token
      )
    end
  end

  def edit
    render Views::People::EditView.new(
      client: @client,
      person: @person,
      current_user: current_user,
      authenticity_token: form_authenticity_token
    )
  end

  def update
    if @person.update(person_params)
      # Log the action
      ActivityLog.create!(
        user: current_user,
        action: "updated",
        loggable: @person,
        metadata: { changes: @person.saved_changes.except("updated_at") }
      )

      redirect_to client_person_path(@client, @person), notice: "Person updated successfully."
    else
      render Views::People::EditView.new(
        client: @client,
        person: @person,
        current_user: current_user,
        authenticity_token: form_authenticity_token
      )
    end
  end

  def destroy
    # Only owners and admins can delete people
    unless current_user.can_delete?(@person)
      redirect_to client_people_path(@client), alert: "You do not have permission to delete this person."
      return
    end

    person_name = @person.name
    @person.destroy

    # Log the action
    ActivityLog.create!(
      user: current_user,
      action: "deleted",
      loggable: nil,
      loggable_type: "Person",
      metadata: { name: person_name, client_name: @client.name }
    )

    redirect_to client_people_path(@client), notice: "Person deleted successfully."
  end

  private

  def set_client
    @client = Client.find(params[:client_id])
  end

  def set_person
    @person = @client.people.find(params[:id])
  end

  def person_params
    params.require(:person).permit(
      :name,
      :notes,
      contact_methods_attributes: [ :id, :value, :_destroy ]
    )
  end
end
