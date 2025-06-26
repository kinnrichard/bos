require "test_helper"

class Admin::AutomationDashboardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @owner = users(:owner)
    @admin = users(:admin)
    @regular_user = users(:technician)
  end

  test "should redirect non-admin users" do
    login_as(@regular_user)
    get admin_automation_dashboard_path
    assert_redirected_to root_path
    assert_equal "Access denied. Admin privileges required.", flash[:alert]
  end

  test "should allow admin users to access dashboard" do
    login_as(@admin)
    get admin_automation_dashboard_path
    assert_response :success
  end

  test "should allow owner users to access dashboard" do
    login_as(@owner)
    get admin_automation_dashboard_path
    assert_response :success
  end

  test "should toggle bug automation on" do
    login_as(@owner)
    post toggle_automation_admin_automation_dashboard_path, params: { enable: "true" }
    assert_redirected_to admin_automation_dashboard_path
    assert_equal "Bug automation has been enabled", flash[:notice]
    assert_equal "true", ENV["BUG_AUTOMATION_ENABLED"]
  end

  test "should toggle bug automation off" do
    login_as(@owner)
    post toggle_automation_admin_automation_dashboard_path, params: { enable: "false" }
    assert_redirected_to admin_automation_dashboard_path
    assert_equal "Bug automation has been disabled", flash[:notice]
    assert_equal "false", ENV["BUG_AUTOMATION_ENABLED"]
  end

  test "should toggle feature notifications on" do
    login_as(@owner)
    post toggle_notifications_admin_automation_dashboard_path, params: { enable: "true" }
    assert_redirected_to admin_automation_dashboard_path
    assert_equal "Feature email notifications have been enabled", flash[:notice]
    assert_equal "true", ENV["FEATURE_EMAIL_NOTIFICATIONS"]
  end

  test "should toggle feature notifications off" do
    login_as(@owner)
    post toggle_notifications_admin_automation_dashboard_path, params: { enable: "false" }
    assert_redirected_to admin_automation_dashboard_path
    assert_equal "Feature email notifications have been disabled", flash[:notice]
    assert_equal "false", ENV["FEATURE_EMAIL_NOTIFICATIONS"]
  end

  private

  def login_as(user)
    post login_path, params: { email: user.email, password: "password123" }
  end
end
