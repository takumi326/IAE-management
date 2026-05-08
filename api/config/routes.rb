Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    match "auth/:provider/callback", to: "auth#google_callback", via: %i[get post]
    get "auth/failure", to: "auth#failure"
    get "auth/me", to: "auth#me"
    delete "auth/logout", to: "auth#logout"

    get "categories/majors", to: "categories#majors"
    get "categories/minors", to: "categories#minors"
    post "categories/majors", to: "categories#create_major"
    post "categories/minors", to: "categories#create_minor"
    patch "categories/majors/:id", to: "categories#update_major"
    patch "categories/minors/:id", to: "categories#update_minor"
    delete "categories/majors/:id", to: "categories#destroy_major"
    delete "categories/minors/:id", to: "categories#destroy_minor"

    resources :payment_methods, only: [ :index, :create, :update, :destroy ]
    resources :expenses, only: [ :index, :create, :update, :destroy ] do
      member do
        get :actuals
      end
    end
    resources :incomes, only: [ :index, :create, :update, :destroy ] do
      member do
        get :actuals
      end
    end

    resources :forecasts, only: [ :index ] do
      collection do
        post :upsert
      end
    end

    post "actuals/sync", to: "actuals#sync"
    get "dashboard", to: "dashboard#show"
    delete "session", to: "sessions#destroy"

    resources :monthly_balances, only: [ :index ] do
      collection do
        post :upsert
      end
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
