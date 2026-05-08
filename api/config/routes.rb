Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    get "categories/majors", to: "categories#majors"
    get "categories/minors", to: "categories#minors"
    post "categories/majors", to: "categories#create_major"
    post "categories/minors", to: "categories#create_minor"
    patch "categories/majors/:id", to: "categories#update_major"
    patch "categories/minors/:id", to: "categories#update_minor"

    resources :payment_methods, only: [ :index, :create ]
    resources :expenses, only: [ :index, :create, :update, :destroy ]
    resources :incomes, only: [ :index, :create, :update, :destroy ]

    resources :forecasts, only: [ :index ] do
      collection do
        post :upsert
      end
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
