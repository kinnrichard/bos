class NotesController < ApplicationController
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :set_client
  before_action :set_job
  before_action :set_note, only: [:destroy]
  
  def create
    @note = @job.notes.build(note_params)
    @note.user = current_user
    
    if @note.save
      respond_to do |format|
        format.json { render json: { status: 'success', note: @note } }
        format.html { redirect_to client_job_path(@client, @job), notice: 'Note was successfully created.' }
      end
    else
      respond_to do |format|
        format.json { render json: { error: @note.errors.full_messages.join(', ') }, status: :unprocessable_entity }
        format.html { redirect_to client_job_path(@client, @job), alert: 'Error creating note.' }
      end
    end
  end
  
  def destroy
    @note.destroy
    redirect_to client_job_path(@client, @job), notice: 'Note was successfully deleted.'
  end
  
  private
  
  def set_client
    @client = current_user.clients.find(params[:client_id])
  end
  
  def set_job
    @job = @client.jobs.find(params[:job_id])
  end
  
  def set_note
    @note = @job.notes.find(params[:id])
  end
  
  def note_params
    params.require(:note).permit(:content)
  end
  
  def json_request?
    request.format.json?
  end
end