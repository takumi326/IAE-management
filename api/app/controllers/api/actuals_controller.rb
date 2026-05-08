module Api
  class ActualsController < ApplicationController
    def sync
      month = sync_month
      result = MonthlyActualsSyncService.new(month: month).call

      render json: {
        data: {
          month: month,
          created_expense_count: result.created_expense_count,
          created_income_count: result.created_income_count
        }
      }
    end

    private

    def sync_month
      value = params[:month]
      return Date.current.beginning_of_month if value.blank?

      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end
  end
end
