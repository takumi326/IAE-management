module Api
  class DashboardController < ApplicationController
    def show
      month = target_month

      render json: {
        data: {
          month: month.strftime("%Y-%m-%d"),
          expense_by_payment: expense_by_payment(month),
          expense_by_category_groups: expense_by_category_groups(month),
          monthly_balance: MonthlyBalance.find_by(month: month)&.amount || 0
        }
      }
    end

    # 今年度（4月〜翌3月）の各月について、実績取引の有無と金額（無い列は予測で補完する前提）
    def fiscal_actuals
      anchor = target_month
      data = fiscal_month_starts(anchor).map do |m|
        m0 = m.beginning_of_month
        mb = MonthlyBalance.find_by(month: m0)
        {
          # フロントの月キーと一致させる（JSON の Date シリアライズが環境で ISO 日時になると月がずれるのを避ける）
          month: m0.strftime("%Y-%m-%d"),
          has_income_actual: income_ledger_exists?(m0),
          has_expense_actual: expense_ledger_exists?(m0),
          income_actual: actual_income_total(m0),
          expense_actual: actual_expense_total(m0),
          has_monthly_balance: mb.present?,
          # 今年度表で「実」の月末残高に表示する値（未保存月は null）
          monthly_balance_amount: mb&.amount
        }
      end

      render json: { data: data }
    end

    private

    def target_month
      value = params[:month]
      return Date.current.beginning_of_month if value.blank?

      Date.parse(value).beginning_of_month
    rescue Date::Error
      Date.current.beginning_of_month
    end

    def fiscal_month_starts(anchor)
      y = anchor.year
      m = anchor.month
      fiscal_year = m >= 4 ? y : y - 1
      start = Date.new(fiscal_year, 4, 1)
      (0..11).map { |i| start.advance(months: i) }
    end

    def income_ledger_exists?(month)
      IncomeTransaction.joins(:ledger_transaction).exists?(transactions: { month: month })
    end

    def expense_ledger_exists?(month)
      ExpenseTransaction.joins(:ledger_transaction).exists?(transactions: { month: month })
    end

    def actual_income_total(month)
      IncomeTransaction.joins(:ledger_transaction)
                         .where(transactions: { month: month })
                         .sum("transactions.amount").to_d.to_i
    end

    def actual_expense_total(month)
      ExpenseTransaction.joins(:ledger_transaction)
                        .where(transactions: { month: month })
                        .sum("transactions.amount").to_d.abs.to_i
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
