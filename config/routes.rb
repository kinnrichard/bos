Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Authentication routes
  get 'login', to: 'sessions#new', as: :login
  post 'login', to: 'sessions#create'
  delete 'logout', to: 'sessions#destroy', as: :logout
  
  # User management routes (superadmin only)
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
        collection do
          patch :reorder
        end
      end
      resources :notes
    end
    member do
      get :schedule
      get :logs
    end
    resources :invoices
  end
  
  # Job routes
  get '/jobs', to: 'all_jobs#index', as: :jobs
  
  # Logs routes
  resources :logs, only: [:index]
  
  # Defines the root path route ("/")
  root "home#show"
end
