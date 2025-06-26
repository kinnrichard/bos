# frozen_string_literal: true

class Priority
  # Job-specific priorities with their emojis
  JOB_PRIORITIES = {
    critical: {
      emoji: "🔥",
      label: "Critical",
      color: "red",
      urgency: 5
    },
    high: {
      emoji: "❗",
      label: "High",
      color: "orange",
      urgency: 4
    },
    normal: {
      emoji: "",
      label: "Normal",
      color: "gray",
      urgency: 3
    },
    low: {
      emoji: "➖",
      label: "Low",
      color: "blue",
      urgency: 2
    },
    proactive_followup: {
      emoji: "💬",
      label: "Proactive Follow-up",
      color: "green",
      urgency: 1
    }
  }.freeze

  # Generic priorities (for other contexts)
  GENERIC_PRIORITIES = {
    high: {
      emoji: "🔴",
      label: "High",
      color: "red",
      urgency: 3
    },
    medium: {
      emoji: "🟡",
      label: "Medium",
      color: "yellow",
      urgency: 2
    },
    low: {
      emoji: "🟢",
      label: "Low",
      color: "green",
      urgency: 1
    }
  }.freeze

  attr_reader :key, :context

  def initialize(priority, context: :job)
    @context = context.to_sym
    @key = priority.to_s.to_sym

    # Handle medium -> normal mapping for job context
    if @context == :job && @key == :medium
      @key = :normal
    end

    unless valid?
      raise ArgumentError, "Invalid priority: #{priority} for context: #{@context}"
    end
  end

  def emoji
    priorities[@key][:emoji] || ""
  end

  def label
    priorities[@key][:label] || @key.to_s.humanize
  end

  def color
    priorities[@key][:color] || "gray"
  end

  def urgency
    priorities[@key][:urgency] || 0
  end

  def to_s
    label
  end

  def to_sym
    @key
  end

  def with_emoji
    emoji.present? ? "#{emoji} #{label}" : label
  end

  # For ActiveRecord integration
  def to_param
    @key.to_s
  end

  # Comparison based on urgency
  def <=>(other)
    return nil unless other.is_a?(Priority)
    other.urgency <=> urgency # Higher urgency comes first
  end

  # Equality
  def ==(other)
    return false unless other.is_a?(Priority)
    @key == other.key && @context == other.context
  end

  def eql?(other)
    self == other
  end

  def hash
    [ @key, @context ].hash
  end

  # Check if this is a high priority
  def high?
    case @context
    when :job
      [ :critical, :high ].include?(@key)
    else
      @key == :high
    end
  end

  # Check if this is a normal/medium priority
  def normal?
    case @context
    when :job
      @key == :normal
    else
      @key == :medium
    end
  end

  # Check if this is a low priority
  def low?
    case @context
    when :job
      [ :low, :proactive_followup ].include?(@key)
    else
      @key == :low
    end
  end

  private

  def priorities
    @context == :job ? JOB_PRIORITIES : GENERIC_PRIORITIES
  end

  def valid?
    priorities.key?(@key)
  end

  # Class methods
  class << self
    def all(context: :job)
      priorities_for(context).keys.map { |key| new(key, context: context) }
    end

    def for_select(context: :job)
      all(context: context).map { |priority| [ priority.label, priority.key.to_s ] }
    end

    def find(key, context: :job)
      new(key, context: context)
    rescue ArgumentError
      nil
    end

    def valid?(priority, context: :job)
      priorities_for(context).key?(priority.to_s.to_sym)
    end

    # For form helpers with emoji
    def options_for_select_with_emoji(context: :job)
      priorities_for(context).map do |key, attrs|
        label = attrs[:emoji].present? ? "#{attrs[:emoji]} #{attrs[:label]}" : attrs[:label]
        [ label, key.to_s ]
      end
    end

    # For form helpers without emoji
    def options_for_select(context: :job)
      priorities_for(context).map { |key, attrs| [ attrs[:label], key.to_s ] }
    end

    private

    def priorities_for(context)
      context.to_sym == :job ? JOB_PRIORITIES : GENERIC_PRIORITIES
    end
  end
end
