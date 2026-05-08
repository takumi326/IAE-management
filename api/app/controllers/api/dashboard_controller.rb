module Api
  class DashboardController < ApplicationController
    def show
      month = target_month

      render json: {
        data: {
          month: month,
          expense_by_payment: expense_by_payment(month),
          expense_by_category_groups: expense_by_category_groups(month),
          monthly_balance: MonthlyBalance.find_by(month: month)&.amount || 0
        }
      }
    end

    private

    def target_month
      value = params[:month]
      return Date.current.beginning_of_month if value.blank?

      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end

    def expense_rows(month)
      ExpenseTransaction
        .joins(:ledger_transaction, expense: [ :payment_method, { minor_category: :major_category } ])
        .where(transactions: { month: month })
    end

    def expense_by_payment(month)
      rows = expense_rows(month)
      grouped = rows.group("payment_methods.id", "payment_methods.name").sum("transactions.amount")

      grouped.map do |(_payment_id, payment_name), amount|
        {
          label: payment_name,
          amount: amount.to_d.abs,
          mode: "実"
        }
      end.sort_by { |row| row[:label] }
    end

    def expense_by_category_groups(month)
      rows = expense_rows(month)
      grouped = rows.group("major_categories.id", "major_categories.name", "minor_categories.id", "minor_categories.name")
                    .sum("transactions.amount")

      by_major = {}
      grouped.each do |(_major_id, major_name, _minor_id, minor_name), amount|
        by_major[major_name] ||= []
        by_major[major_name] << {
          label: minor_name,
          amount: amount.to_d.abs,
          mode: "実"
        }
      end

      by_major.keys.sort.map do |major_name|
        {
          major: major_name,
          mode: "実",
          minors: by_major[major_name].sort_by { |row| row[:label] }
        }
      end
    end
  end
end
