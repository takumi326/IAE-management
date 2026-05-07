module Api
  class ForecastsController < ApplicationController
    before_action :set_forecast, only: [ :update, :destroy ]
    before_action :ensure_forecast!, only: [ :update, :destroy ]

    def index
      forecasts = Forecast.order(:month, :kind, :id)
      render json: { data: forecasts.map { |f| forecast_json(f) } }
    end

    def create
      forecast = Forecast.new(forecast_params)
      if forecast.save
        render json: { data: forecast_json(forecast) }, status: :created
      else
        render json: { error: { code: "validation_error", message: "Invalid forecast params", details: forecast.errors } },
               status: :unprocessable_entity
      end
    end

    def update
      if @forecast.update(forecast_params)
        render json: { data: forecast_json(@forecast) }
      else
        render json: { error: { code: "validation_error", message: "Invalid forecast params", details: @forecast.errors } },
               status: :unprocessable_entity
      end
    end

    def destroy
      if @forecast.destroy
        head :no_content
      else
        render json: { error: { code: "conflict", message: "Forecast could not be deleted" } }, status: :conflict
      end
    end

    private

    def set_forecast
      @forecast = Forecast.find_by(id: params[:id])
    end

    def ensure_forecast!
      return if @forecast.present?

      render json: { error: { code: "not_found", message: "Forecast not found" } }, status: :not_found
    end

    def forecast_params
      params.expect(forecast: [ :kind, :month, :amount ])
    end

    def forecast_json(forecast)
      forecast.as_json(only: [ :id, :kind, :month, :amount ])
    end
  end
end
