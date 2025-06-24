require "check_digit"

class UniqueId < ApplicationRecord
  # Polymorphic association
  belongs_to :identifiable, polymorphic: true, optional: true

  # Validations
  validates :minimum_length, numericality: { greater_than_or_equal_to: 1 }
  validates :generated_id, presence: true, uniqueness: true

  # Callbacks
  before_validation :generate_id, on: :create

  # Class method to generate a new unique ID and save it
  def self.generate(options = {})
    create!(options)
  end

  # Instance method to regenerate the ID (useful if needed)
  def regenerate_id!
    self.generated_id = nil
    generate_id
    save!
  end

  private

  def generate_id
    return if generated_id.present?

    iteration = 1
    current_min_length = minimum_length || 5

    loop do
      # Increase length after 9 failed attempts
      if iteration > 9
        current_min_length += 1
        iteration = 1
      end

      # Generate candidate ID
      candidate = build_id_candidate(current_min_length)

      # Check if ID already exists
      if !self.class.exists?(generated_id: candidate)
        self.generated_id = candidate
        break
      end

      iteration += 1
    end
  end

  def build_id_candidate(current_min_length)
    # Account for prefix and suffix lengths
    prefix_length = prefix.to_s.length
    suffix_length = suffix.to_s.length

    # Calculate the length for the random number portion
    number_length = current_min_length - prefix_length - suffix_length

    # If using checksum, we need one less digit for the number
    number_length -= 1 if use_checksum

    # Ensure we have at least 1 digit for the number
    number_length = [ number_length, 1 ].max

    # Generate random number of specified length
    min = 10**(number_length - 1)
    max = (10**number_length) - 1
    rand_num = rand(min..max)

    # Build the final ID
    if use_checksum
      checksum = CheckDigit::Verhoeff.checksum(rand_num.to_s)
      "#{prefix}#{rand_num}#{checksum}#{suffix}"
    else
      "#{prefix}#{rand_num}#{suffix}"
    end
  end
end
