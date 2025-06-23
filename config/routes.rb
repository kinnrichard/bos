Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Simple health check that doesn't check migrations
  get "up" => "health#show", as: :rails_health_check

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
        end
        collection do
          patch :reorder
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

  # Defines the root path route ("/")
  root "home#show"
end
