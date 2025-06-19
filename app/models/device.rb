class Device < ApplicationRecord
  belongs_to :client
  belongs_to :person, optional: true
  
  validates :name, presence: true
  
  # For displaying in views - hide empty fields
  def display_location?
    location.present?
  end
  
  def display_notes?
    notes.present?
  end
end
