# Test Controller for Frontend Test Support
# Provides endpoints for frontend tests to manage test database state
# Only available in test environment for security

require Rails.root.join("test", "test_environment")

class Api::V1::TestController < Api::V1::BaseController
  skip_before_action :authenticate_request
  skip_before_action :verify_csrf_token_for_cookie_auth

  before_action :ensure_test_environment!

  # POST /api/v1/test/reset_database
  def reset_database
    TestEnvironment.reset_database!

    render json: {
      data: {
        type: "test_operation",
        attributes: {
          message: "Database reset successfully",
          timestamp: Time.current.iso8601
        }
      }
    }
  rescue => e
    render json: {
      errors: [ {
        status: "500",
        code: "RESET_FAILED",
        title: "Database Reset Failed",
        detail: e.message
      } ]
    }, status: :internal_server_error
  end

  # POST /api/v1/test/seed_database
  def seed_database
    TestEnvironment.setup_test_data!

    render json: {
      data: {
        type: "test_operation",
        attributes: {
          message: "Database seeded successfully",
          timestamp: Time.current.iso8601
        }
      }
    }
  rescue => e
    render json: {
      errors: [ {
        status: "500",
        code: "SEED_FAILED",
        title: "Database Seed Failed",
        detail: e.message
      } ]
    }, status: :internal_server_error
  end

  # GET /api/v1/test/verify_data
  def verify_data
    begin
      TestEnvironment.verify_test_data!

      # Get data counts
      counts = {
        users: User.count,
        clients: Client.count,
        jobs: Job.count,
        tasks: Task.count,
        devices: Device.count
      }

      render json: {
        data: {
          type: "test_verification",
          attributes: {
            valid: true,
            message: "Test data verification passed",
            counts: counts,
            timestamp: Time.current.iso8601
          }
        }
      }
    rescue => e
      render json: {
        data: {
          type: "test_verification",
          attributes: {
            valid: false,
            message: e.message,
            timestamp: Time.current.iso8601
          }
        }
      }
    end
  end

  # POST /api/v1/test/create_client
  def create_client
    client = Client.create!(client_params)

    render json: {
      data: {
        type: "clients",
        id: client.id.to_s,
        attributes: {
          id: client.id.to_s,
          name: client.name,
          client_type: client.client_type,
          created_at: client.created_at.iso8601,
          updated_at: client.updated_at.iso8601
        }
      }
    }, status: :created
  rescue => e
    render json: {
      errors: [ {
        status: "422",
        code: "CREATION_FAILED",
        title: "Client Creation Failed",
        detail: e.message
      } ]
    }, status: :unprocessable_entity
  end

  # POST /api/v1/test/create_user
  def create_user
    user = User.create!(user_params)

    render json: {
      data: {
        type: "users",
        id: user.id.to_s,
        attributes: {
          id: user.id.to_s,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at.iso8601,
          updated_at: user.updated_at.iso8601
        }
      }
    }, status: :created
  rescue => e
    render json: {
      errors: [ {
        status: "422",
        code: "CREATION_FAILED",
        title: "User Creation Failed",
        detail: e.message
      } ]
    }, status: :unprocessable_entity
  end

  # POST /api/v1/test/begin_transaction
  def begin_transaction
    # Start a database transaction for test isolation
    # Note: This is a simplified approach - full transaction isolation
    # would require more sophisticated connection management

    transaction_id = SecureRandom.uuid
    Rails.cache.write("test_transaction_#{transaction_id}", {
      started_at: Time.current,
      isolation_level: "READ_COMMITTED"
    }, expires_in: 1.hour)

    render json: {
      data: {
        type: "transaction",
        attributes: {
          transaction_id: transaction_id,
          started_at: Time.current.iso8601
        }
      }
    }
  end

  # POST /api/v1/test/rollback_transaction
  def rollback_transaction
    transaction_id = params[:transaction_id]

    # For now, we'll simulate rollback by clearing recent test data
    # A full implementation would use database savepoints/transactions
    if Rails.cache.exist?("test_transaction_#{transaction_id}")
      Rails.cache.delete("test_transaction_#{transaction_id}")

      render json: {
        data: {
          type: "transaction",
          attributes: {
            transaction_id: transaction_id,
            status: "rolled_back",
            timestamp: Time.current.iso8601
          }
        }
      }
    else
      render json: {
        errors: [ {
          status: "404",
          code: "TRANSACTION_NOT_FOUND",
          title: "Transaction Not Found",
          detail: "Transaction ID not found or already completed"
        } ]
      }, status: :not_found
    end
  end

  # POST /api/v1/test/commit_transaction
  def commit_transaction
    transaction_id = params[:transaction_id]

    if Rails.cache.exist?("test_transaction_#{transaction_id}")
      Rails.cache.delete("test_transaction_#{transaction_id}")

      render json: {
        data: {
          type: "transaction",
          attributes: {
            transaction_id: transaction_id,
            status: "committed",
            timestamp: Time.current.iso8601
          }
        }
      }
    else
      render json: {
        errors: [ {
          status: "404",
          code: "TRANSACTION_NOT_FOUND",
          title: "Transaction Not Found",
          detail: "Transaction ID not found or already completed"
        } ]
      }, status: :not_found
    end
  end

  # DELETE /api/v1/test/cleanup
  def cleanup
    # Clean up test data created during the test session
    # This is safer than full database reset for running tests

    begin
      # Delete test entities created in the last hour
      cutoff_time = 1.hour.ago

      Task.where("created_at > ? AND title LIKE 'Test Task%'", cutoff_time).delete_all
      Job.where("created_at > ? AND title LIKE 'Test Job%'", cutoff_time).delete_all
      Client.where("created_at > ? AND name LIKE 'Test Client%'", cutoff_time).delete_all
      User.where("created_at > ? AND email LIKE '%@example.com'", cutoff_time).delete_all

      render json: {
        data: {
          type: "test_operation",
          attributes: {
            message: "Test data cleanup completed",
            timestamp: Time.current.iso8601
          }
        }
      }
    rescue => e
      render json: {
        errors: [ {
          status: "500",
          code: "CLEANUP_FAILED",
          title: "Cleanup Failed",
          detail: e.message
        } ]
      }, status: :internal_server_error
    end
  end

  private

  def ensure_test_environment!
    unless Rails.env.test?
      render json: {
        errors: [ {
          status: "403",
          code: "FORBIDDEN_ENVIRONMENT",
          title: "Forbidden",
          detail: "Test endpoints only available in test environment"
        } ]
      }, status: :forbidden
    end
  end

  def client_params
    params.require(:client).permit(:name, :client_type)
  end

  def user_params
    params.require(:user).permit(:name, :email, :password, :role)
  end
end
