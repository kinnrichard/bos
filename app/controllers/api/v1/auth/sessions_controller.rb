class Api::V1::Auth::SessionsController < Api::V1::BaseController
  skip_before_action :authenticate_request, only: [ :create, :refresh ]

  # POST /api/v1/auth/login
  def create
    user = User.find_by(email: login_params[:email]&.downcase)

    if user&.authenticate(login_params[:password])
      token = generate_tokens(user)
      set_auth_cookie(token[:access_token], token[:refresh_token])

      render json: {
        data: {
          type: "auth",
          id: user.id.to_s,
          attributes: {
            access_token: token[:access_token],
            refresh_token: token[:refresh_token],
            expires_at: token[:expires_at]
          },
          relationships: {
            user: {
              data: { type: "users", id: user.id.to_s }
            }
          }
        },
        included: [ {
          type: "users",
          id: user.id.to_s,
          attributes: {
            email: user.email,
            name: user.name,
            role: user.role
          }
        } ]
      }, status: :ok
    else
      render json: {
        errors: [ {
          status: "401",
          code: "INVALID_CREDENTIALS",
          title: "Authentication Failed",
          detail: "Invalid email or password"
        } ]
      }, status: :unauthorized
    end
  end

  # POST /api/v1/auth/refresh
  def refresh
    token = refresh_params[:refresh_token] || cookies.signed[:refresh_token]

    if token.blank?
      return render json: {
        errors: [ {
          status: "400",
          code: "MISSING_TOKEN",
          title: "Missing Refresh Token",
          detail: "Refresh token is required"
        } ]
      }, status: :bad_request
    end

    begin
      payload = JwtService.decode(token)

      if payload[:type] != "refresh"
        raise StandardError, "Invalid token type"
      end

      user = User.find(payload[:user_id])
      new_tokens = generate_tokens(user)
      set_auth_cookie(new_tokens[:access_token], new_tokens[:refresh_token])

      render json: {
        data: {
          type: "auth",
          id: user.id.to_s,
          attributes: {
            access_token: new_tokens[:access_token],
            refresh_token: new_tokens[:refresh_token],
            expires_at: new_tokens[:expires_at]
          }
        }
      }, status: :ok
    rescue StandardError => e
      render json: {
        errors: [ {
          status: "401",
          code: "INVALID_TOKEN",
          title: "Invalid Refresh Token",
          detail: e.message
        } ]
      }, status: :unauthorized
    end
  end

  # POST /api/v1/auth/logout
  def destroy
    clear_auth_cookies

    # In a production app, you might want to blacklist the JWT here
    # or track revoked tokens in Redis/database

    render json: {
      data: {
        type: "auth",
        attributes: {
          message: "Successfully logged out"
        }
      }
    }, status: :ok
  end

  private

  def login_params
    params.require(:auth).permit(:email, :password)
  end

  def refresh_params
    params.except(:session, :controller, :action).permit(:refresh_token)
  end

  def generate_tokens(user)
    access_token = JwtService.encode(
      { user_id: user.id, type: "access" },
      15.minutes.from_now
    )

    refresh_token = JwtService.encode(
      { user_id: user.id, type: "refresh" },
      2.weeks.from_now
    )

    {
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: 15.minutes.from_now.iso8601
    }
  end

  def set_auth_cookie(token, refresh_token = nil)
    cookies.signed[:auth_token] = {
      value: token,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      expires: 15.minutes.from_now
    }

    # Set refresh token if provided
    if refresh_token
      cookies.signed[:refresh_token] = {
        value: refresh_token,
        httponly: true,
        secure: Rails.env.production?,
        same_site: :lax,
        expires: 2.weeks.from_now
      }
    end
  end

  def clear_auth_cookies
    cookies.delete(:auth_token)
    cookies.delete(:refresh_token)
  end
end
