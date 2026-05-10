module Api
  class ActualsController < ApplicationController
    # month 省略時は「今月」と「翌月」の 2 ヶ月分を同期（定期の取引が無ければ生成）
    # expense_scope: 省略=all / one_time=単発支出のみ（month 必須） / recurring=定期支出のみ（常に今月・来月の 2 ヶ月。month は無視）
    def sync
      scope = parse_expense_scope
      if scope == :invalid
        return render json: {
          error: { code: "bad_request", message: "expense_scope は one_time / recurring / 省略 のみ有効です。" }
        }, status: :unprocessable_entity
      end

      if scope == :one_time && params[:month].blank?
        return render json: {
          error: { code: "bad_request", message: "expense_scope が one_time のときは month が必要です。" }
        }, status: :unprocessable_entity
      end

      months = sync_months_for(scope)
      total_expense = 0
      total_income = 0
      by_month = []

      months.each do |m|
        result = MonthlyActualsSyncService.new(month: m, expense_scope: scope).call
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

    def parse_expense_scope
      raw = params[:expense_scope].presence
      return :all if raw.blank?
      return :one_time if raw == "one_time"
      return :recurring if raw == "recurring"

      :invalid
    end

    def sync_months_for(scope)
      case scope
      when :recurring
        t = Date.current
        [ t.beginning_of_month, t.next_month.beginning_of_month ]
      when :one_time
        [ parse_sync_month(params[:month]) ]
      else
        if params[:month].present?
          [ parse_sync_month(params[:month]) ]
        else
          t = Date.current
          [ t.beginning_of_month, t.next_month.beginning_of_month ]
        end
      end
    end

    def parse_sync_month(value)
      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end
  end
end
