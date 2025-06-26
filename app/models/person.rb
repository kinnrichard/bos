class Person < ApplicationRecord
  include Loggable

  belongs_to :client
  has_many :contact_methods, dependent: :destroy
  has_many :devices, dependent: :destroy

  validates :name, presence: true

  accepts_nested_attributes_for :contact_methods,
    allow_destroy: true,
    reject_if: :all_blank
end
