class FrontConversation < ApplicationRecord
  # Associations
  has_many :front_messages, dependent: :destroy
  has_many :front_conversation_tags, dependent: :destroy
  has_many :front_tags, through: :front_conversation_tags
  has_many :front_conversation_inboxes, dependent: :destroy
  has_many :front_inboxes, through: :front_conversation_inboxes

  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :recipient_contact, class_name: "FrontContact", optional: true

  # Validations
  validates :front_id, presence: true, uniqueness: true
  validates :status, presence: true

  # Scopes
  scope :unassigned, -> { where(status: "unassigned") }
  scope :assigned, -> { where(status: "assigned") }
  scope :archived, -> { where(status: "archived") }
  scope :open, -> { where(status_category: "open") }
  scope :recent, -> { order(created_at_timestamp: :desc) }

  # Helper methods
  def created_time
    Time.at(created_at_timestamp) if created_at_timestamp
  end

  def waiting_since_time
    Time.at(waiting_since_timestamp) if waiting_since_timestamp
  end

  def primary_inbox
    front_inboxes.first
  end
end
