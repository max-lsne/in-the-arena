Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :companies, only: %i[index], param: :slug
      get "companies/:slug", to: "companies#show", as: :company

      resources :metrics, only: %i[index]

      post "retrieval/search", to: "retrieval#search"
    end
  end

  get "up", to: "rails/health#show", as: :rails_health_check
end
