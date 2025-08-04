class FrontMessage < ApplicationRecord
  # Associations
  belongs_to :front_conversation
  belongs_to :author, polymorphic: true, optional: true  # Can be FrontContact or FrontTeammate
  has_many :front_message_recipients, dependent: :destroy
  has_many :recipients, through: :front_message_recipients, source: :front_contact
  has_many :front_attachments, dependent: :destroy

  # Validations
  validates :front_id, presence: true, uniqueness: true
  validates :message_type, presence: true

  # Scopes
  scope :inbound, -> { where(is_inbound: true) }
  scope :outbound, -> { where(is_inbound: false) }
  scope :emails, -> { where(message_type: "email") }
  scope :recent, -> { order(created_at_timestamp: :desc) }

  # Helper methods
  def created_time
    Time.at(created_at_timestamp) if created_at_timestamp
  end

  def body_content
    body_plain.presence || body_html
  end

  def from_recipients
    front_message_recipients.where(role: "from")
  end

  def to_recipients
    front_message_recipients.where(role: "to")
  end

  def cc_recipients
    front_message_recipients.where(role: "cc")
  end

  # Get author display name from polymorphic association or stored fields
  def author_display_name
    if author.present?
      author.display_name
    else
      author_name.presence || author_handle
    end
  end

  # Get author email/handle
  def author_email
    if author.present?
      author.respond_to?(:email) ? author.email : author.handle
    else
      author_handle
    end
  end
end
