module Api
  class ForecastDefaultsController < ApplicationController
    def show
      rec = ForecastDefault.instance
      render json: { data: forecast_default_json(rec) }
    end

    def update
      rec = ForecastDefault.instance
      attrs = forecast_default_params
      rec.expense_amount = attrs[:expense_amount]
      rec.income_amount = attrs[:income_amount]

      if rec.save
        render json: { data: forecast_default_json(rec) }
      else
        render json: { error: { code: "validation_error", message: "Invalid forecast defaults", details: rec.errors } },
               status: :unprocessable_entity
      end
    end

    private

    def forecast_default_params
      params.expect(forecast_default: [ :expense_amount, :income_amount ])
    end

    def forecast_default_json(rec)
      {
        expense_amount: rec.expense_amount.to_i,
        income_amount: rec.income_amount.to_i
      }
    end
  end
end
