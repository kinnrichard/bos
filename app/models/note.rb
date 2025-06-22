class Note < ApplicationRecord
  belongs_to :notable, polymorphic: true
  belongs_to :user

  validates :content, presence: true
end
