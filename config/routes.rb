Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Mount Action Cable for WebSocket connections
  mount ActionCable.server => "/cable"

  # API v1 namespace
  namespace :api do
    namespace :v1 do
      # Health check endpoint
      get "health", to: "health#show"

      # CSRF test endpoint for development debugging
      get "csrf_test", to: "health#csrf_test" if Rails.env.development?

      # Authentication endpoints
      namespace :auth do
        post "login", to: "sessions#create"
        post "refresh", to: "sessions#refresh"
        post "logout", to: "sessions#destroy"
      end

      # WebSocket connection info
      get "websocket/connection_info", to: "websocket#connection_info"

      # API documentation
      get "documentation", to: "documentation#index"

      # Resource endpoints
      resources :users, only: [ :index ]

      resources :jobs do
        resources :tasks do
          collection do
            patch :batch_reorder
            get :batch_details
          end
          member do
            patch :reorder
            patch :update_status
            get :details
            patch :assign
            post :notes, action: :add_note
          end
        end
        member do
          patch :technicians, to: "jobs#update_technicians"
        end
      end
    end
  end

  # Health check is handled in config.ru to bypass Rails middleware

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Authentication routes
  get "login", to: "sessions#new", as: :login
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy", as: :logout

  # User settings route (accessible to all users)
  get "settings", to: "users#settings", as: :settings
  patch "settings", to: "users#update_settings", as: :update_settings

  # User management routes (owner only)
  resources :users

  # Client routes
  resources :clients do
    collection do
      get :search
    end

    resources :people
    resources :devices
    resources :jobs do
      resources :tasks do
        member do
          patch :reorder
          get :details
          patch :assign
          post :notes, action: :add_note
        end
        collection do
          patch :reorder
          get :search
        end
      end
      resources :notes
      resources :scheduled_date_times, only: [ :create, :update, :destroy ]
    end
    member do
      get :schedule
      get :logs
    end
    resources :invoices
  end

  # Job routes
  get "/jobs", to: "all_jobs#index", as: :jobs

  # Logs routes
  resources :logs, only: [ :index ]

  # Feedback routes
  resource :feedback, only: [ :new, :create ], controller: "feedback"

  # GitHub webhook routes
  post "/github/webhook", to: "github_webhooks#issue_comment"

  # Admin routes
  namespace :admin do
    # Turning off; this function is abstracted to a separate ruby script on a separate server
    # resource :automation_dashboard, only: [ :show ] do
    #   post :toggle_automation
    #   post :toggle_notifications
    # end
  end

  # Defines the root path route ("/")
  root "home#show"
end
