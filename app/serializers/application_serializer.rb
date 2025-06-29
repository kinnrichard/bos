class ApplicationSerializer
  include JSONAPI::Serializer

  # Common configuration for all serializers
  set_key_transform :camel_lower

  # Helper method to serialize timestamps
  def self.timestamp_attributes(*attrs)
    attrs.each do |attr|
      attribute attr do |object|
        object.send(attr)&.iso8601
      end
    end
  end
end
