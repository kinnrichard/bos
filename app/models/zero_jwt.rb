class ZeroJwt
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :user_id, :string
  attribute :sub, :string
  attribute :exp, :integer

  def self.generate(user_id:, expires_in: 7.days)
    payload = {
      sub: user_id.to_s,  # Zero requires sub to be a string
      exp: Time.now.to_i + expires_in.to_i
    }

    # Use the same secret as zero-config.json
    secret = ENV["ZERO_AUTH_SECRET"] || "dev-secret-change-in-production"
    JWT.encode(payload, secret)
  end

  def self.decode(token)
    # Use the same secret as zero-config.json
    secret = ENV["ZERO_AUTH_SECRET"] || "dev-secret-change-in-production"
    payload = JWT.decode(token, secret).first
    new(
      user_id: payload["sub"],
      sub: payload["sub"],
      exp: payload["exp"]
    )
  rescue JWT::DecodeError => e
    Rails.logger.error "JWT decode error: #{e.message}"
    nil
  end

  def expired?
    return true unless exp
    Time.current.to_i > exp
  end

  def valid?
    user_id.present? && !expired?
  end
end
