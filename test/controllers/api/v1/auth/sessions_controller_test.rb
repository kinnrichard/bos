require "test_helper"

class Api::V1::Auth::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:technician)
  end

  test "should login with valid credentials" do
    post api_v1_auth_login_url, params: {
      auth: {
        email: @user.email,
        password: "password123"
      }
    }, as: :json

    assert_response :success

    json_response = JSON.parse(response.body)
    assert json_response["data"]["attributes"]["access_token"].present?
    assert json_response["data"]["attributes"]["refresh_token"].present?
    assert json_response["included"][0]["attributes"]["email"] == @user.email

    # Check cookies are set
    assert cookies[:auth_token].present?
    assert cookies[:refresh_token].present?
  end

  test "should not login with invalid credentials" do
    post api_v1_auth_login_url, params: {
      auth: {
        email: @user.email,
        password: "wrongpassword"
      }
    }, as: :json

    assert_response :unauthorized

    json_response = JSON.parse(response.body)
    assert json_response["errors"][0]["code"] == "INVALID_CREDENTIALS"
  end

  test "should refresh token with valid refresh token" do
    # First login to get tokens
    post api_v1_auth_login_url, params: {
      auth: {
        email: @user.email,
        password: "password123"
      }
    }, as: :json

    json_response = JSON.parse(response.body)
    refresh_token = json_response["data"]["attributes"]["refresh_token"]

    # Now refresh
    post api_v1_auth_refresh_url, params: {
      refresh_token: refresh_token
    }, as: :json

    assert_response :success

    json_response = JSON.parse(response.body)
    assert json_response["data"]["attributes"]["access_token"].present?
    assert json_response["data"]["attributes"]["refresh_token"].present?
  end

  test "should logout successfully" do
    # First login
    post api_v1_auth_login_url, params: {
      auth: {
        email: @user.email,
        password: "password123"
      }
    }, as: :json

    access_token = JSON.parse(response.body)["data"]["attributes"]["access_token"]

    # Now logout
    post api_v1_auth_logout_url, headers: {
      "Authorization" => "Bearer #{access_token}"
    }, as: :json

    assert_response :success

    # Check cookies are cleared
    assert cookies[:auth_token].blank?
    assert cookies[:refresh_token].blank?
  end

  test "should require authentication for logout" do
    post api_v1_auth_logout_url, as: :json

    assert_response :unauthorized
  end
end
