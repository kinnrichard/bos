class Client < ApplicationRecord
  # Validations
  validates :name, presence: true
  validates :client_type, presence: true
  
  # Enum for client types
  enum :client_type, {
    residential: "residential",
    business: "business"
  }
  
  # Scopes for searching
  scope :search, ->(query) { where("name ILIKE ?", "%#{query}%") if query.present? }
  
  # Default ordering
  default_scope { order(:name) }
end
