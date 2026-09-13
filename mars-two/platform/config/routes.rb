Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :companies, only: %i[index], param: :slug
      get "companies/:slug", to: "companies#show", as: :company

      resources :metrics, only: %i[index]
      get "benchmark", to: "benchmark#index"
      resources :initiatives, only: %i[index]

      post "retrieval/search", to: "retrieval#search"

      get "reconciliation/contract_billing", to: "reconciliation#contract_billing"

      get "detections/crm_hygiene", to: "detections#crm_hygiene"
      get "detections/onboarding_stalls", to: "detections#onboarding_stalls"
      get "detections/churn_risk", to: "detections#churn_risk"

      get "evals/cases", to: "evals#cases"
    end
  end

  get "up", to: "rails/health#show", as: :rails_health_check
end
