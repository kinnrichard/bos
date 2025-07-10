class ZeroJwt
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :user_id, :string
  attribute :sub, :string
  attribute :exp, :integer

  def self.generate(user_id:, expires_in: 24.hours)
    payload = {
      sub: user_id,
      exp: expires_in.from_now.to_i
    }

    JWT.encode(payload, Rails.application.credentials.zero_auth_secret || ENV["ZERO_AUTH_SECRET"])
  end

  def self.decode(token)
    payload = JWT.decode(token, Rails.application.credentials.zero_auth_secret || ENV["ZERO_AUTH_SECRET"]).first
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
