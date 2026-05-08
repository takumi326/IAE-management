module Api
  class ForecastsController < ApplicationController
    def index
      forecasts = Forecast.order(:month, :kind, :id)
      render json: { data: forecasts.map { |f| forecast_json(f) } }
    end

    # Upsert by (kind, month). Always idempotent for the (kind, month) pair.
    def upsert
      attrs = upsert_params
      forecast = Forecast.find_or_initialize_by(kind: attrs[:kind], month: attrs[:month])
      forecast.amount = attrs[:amount]

      if forecast.save
        render json: { data: forecast_json(forecast) }, status: forecast.previously_new_record? ? :created : :ok
      else
        render json: { error: { code: "validation_error", message: "Invalid forecast params", details: forecast.errors } },
               status: :unprocessable_entity
      end
    end

    private

    def upsert_params
      params.expect(forecast: [ :kind, :month, :amount ])
    end

    def forecast_json(forecast)
      forecast.as_json(only: [ :id, :kind, :month, :amount ])
    end
  end
end
