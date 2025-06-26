class PeopleController < ApplicationController
  before_action :set_client
  before_action :authorize_client_access!
  before_action :set_person, only: [ :show, :edit, :update, :destroy ]

  def index
    @people = @client.people.includes(:contact_methods)
    view_data = ViewDataService.people_index_data(people: @people)
    sidebar_stats = SidebarStatsService.new(user: current_user, client: @client).calculate

    render Views::People::IndexView.new(
      client: @client,
      people: view_data[:people],
      contact_types_by_person: view_data[:contact_types_by_person],
      current_user: current_user,
      sidebar_stats: sidebar_stats
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
      # The Loggable concern will automatically log the update
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

    # Log the deletion before destroying (Loggable can't log after destroy)
    @person.log_action("deleted", user: current_user, metadata: { name: person_name, client_name: @client.name })
    @person.destroy

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
