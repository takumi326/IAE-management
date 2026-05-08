module Api
  class MonthlyBalancesController < ApplicationController
    def index
      month = target_month
      row = MonthlyBalance.find_by(month: month)
      render json: { data: [ balance_json(row || MonthlyBalance.new(month: month, amount: 0)) ] }
    end

    def upsert
      month = target_month
      balance = MonthlyBalance.find_or_initialize_by(month: month)
      balance.amount = balance_params[:amount]

      if balance.save
        render json: { data: balance_json(balance) }
      else
        render json: { error: { code: "validation_error", message: "Invalid monthly balance params", details: balance.errors } },
               status: :unprocessable_entity
      end
    end

    private

    def target_month
      value = params[:month] || params.dig(:monthly_balance, :month)
      return Date.current.beginning_of_month if value.blank?

      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end

    def balance_params
      params.expect(monthly_balance: [ :amount ])
    end

    def balance_json(row)
      { month: row.month, amount: row.amount }
    end
  end
end
