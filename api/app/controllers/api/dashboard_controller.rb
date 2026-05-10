module Api
  class DashboardController < ApplicationController
    include FiscalYearMonths
    def show
      month = target_month

      render json: {
        data: {
          month: month.strftime("%Y-%m-%d"),
          expense_by_payment: expense_by_payment(month),
          expense_by_category_groups: expense_by_category_groups(month),
          expense_line_items: expense_line_items(month),
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
          # ダッシュボードの支出サマリーは「単発が1件でもあれば実・定期のみなら予」に使う
          has_one_time_expense_actual: one_time_expense_ledger_exists?(m0),
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

    def income_ledger_exists?(month)
      IncomeTransaction.joins(:ledger_transaction).exists?(transactions: { month: month })
    end

    def expense_ledger_exists?(month)
      ExpenseTransaction.joins(:ledger_transaction).exists?(transactions: { month: month })
    end

    def one_time_expense_ledger_exists?(month)
      ExpenseTransaction
        .joins(:ledger_transaction, :expense)
        .merge(Expense.expense_type_one_time)
        .exists?(transactions: { month: month })
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
      expense_transactions_for_month(month)
    end

    def expense_transactions_for_month(month)
      ExpenseTransaction
        .joins(:ledger_transaction, expense: [ :payment_method, { minor_category: :major_category } ])
        .where(transactions: { month: month })
    end

    def expense_line_items(month)
      expense_transactions_for_month(month)
        .preload(expense: [ :payment_method, { minor_category: :major_category } ])
        .order(Arel.sql("payment_methods.name ASC, expenses.id ASC"))
        .map do |et|
          e = et.expense
          {
            expense_id: e.id,
            expense_type: e.expense_type,
            recurring_cycle: (e.expense_type_recurring? ? e.recurring_cycle : nil),
            major: e.minor_category.major_category.name,
            minor: e.minor_category.name,
            payment: e.payment_method.name,
            amount: et.ledger_transaction.amount.to_d.abs,
            memo: e.memo
          }
        end
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
