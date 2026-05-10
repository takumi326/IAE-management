module Api
  class ActualsController < ApplicationController
    # month 省略時は「今月」と「翌月」の 2 ヶ月分を同期（定期の取引が無ければ生成）
    def sync
      months = sync_months
      total_expense = 0
      total_income = 0
      by_month = []

      months.each do |m|
        result = MonthlyActualsSyncService.new(month: m).call
        total_expense += result.created_expense_count
        total_income += result.created_income_count
        by_month << {
          month: m.to_s,
          created_expense_count: result.created_expense_count,
          created_income_count: result.created_income_count
        }
      end

      render json: {
        data: {
          months: months.map(&:to_s),
          created_expense_count: total_expense,
          created_income_count: total_income,
          by_month: by_month
        }
      }
    end

    private

    def sync_months
      if params[:month].present?
        return [ parse_sync_month(params[:month]) ]
      end

      today = Date.current
      [ today.beginning_of_month, today.next_month.beginning_of_month ]
    end

    def parse_sync_month(value)
      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end
  end
end
