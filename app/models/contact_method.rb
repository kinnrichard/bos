class ContactMethod < ApplicationRecord
  belongs_to :person

  enum :contact_type, {
    phone: 0,
    email: 1,
    address: 2
  }

  before_validation :detect_and_format_type

  validates :value, presence: true

  # Value object integration
  def contact_type_object
    ContactMethodType.new(contact_type)
  end

  # Delegate display methods to value object
  delegate :emoji, :label, :placeholder, :input_type, :with_emoji,
           to: :contact_type_object, prefix: :contact_type

  alias_method :type_emoji, :contact_type_emoji
  alias_method :type_label, :contact_type_label

  private

  def detect_and_format_type
    return unless value.present?

    # Check if it's an email
    if value.match?(/\A[^@\s]+@[^@\s]+\z/)
      self.contact_type = :email
      self.formatted_value = value.downcase
    # Check if it's a phone number (digits, spaces, parentheses, dashes)
    elsif value.gsub(/\D/, "").match?(/\A\d{10,11}\z/)
      self.contact_type = :phone
      format_phone_number
    else
      self.contact_type = :address
      self.formatted_value = value
    end
  end

  def format_phone_number
    # Remove all non-digits
    digits = value.gsub(/\D/, "")

    # Format as (812) 321-3123
    if digits.length == 10
      self.formatted_value = "(#{digits[0..2]}) #{digits[3..5]}-#{digits[6..9]}"
    elsif digits.length == 11 && digits[0] == "1"
      # Remove country code
      digits = digits[1..-1]
      self.formatted_value = "(#{digits[0..2]}) #{digits[3..5]}-#{digits[6..9]}"
    else
      self.formatted_value = value
    end
  end
end
