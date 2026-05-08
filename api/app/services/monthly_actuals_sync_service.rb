class MonthlyActualsSyncService
  Result = Struct.new(:created_expense_count, :created_income_count, keyword_init: true)

  def initialize(month:)
    @month = month
  end

  def call
    created_expense_count = 0
    created_income_count = 0

    ActiveRecord::Base.transaction do
      target_expenses.find_each do |expense|
        next if expense.expense_transactions.joins(:ledger_transaction).exists?(transactions: { month: @month })

        tx = Transaction.create!(month: @month, amount: -expense.amount)
        ExpenseTransaction.create!(expense: expense, ledger_transaction: tx)
        created_expense_count += 1
      end

      target_incomes.find_each do |income|
        next if income.income_transactions.joins(:ledger_transaction).exists?(transactions: { month: @month })

        tx = Transaction.create!(month: @month, amount: income.amount)
        IncomeTransaction.create!(income: income, ledger_transaction: tx)
        created_income_count += 1
      end
    end

    Result.new(created_expense_count:, created_income_count:)
  end

  private

  def target_expenses
    one_time = Expense.where(expense_type: :one_time, start_month: @month)
    monthly = Expense.where(expense_type: :recurring, recurring_cycle: :monthly)
                     .where("start_month <= ?", @month)
                     .where("end_month IS NULL OR end_month >= ?", @month)
    yearly = Expense.where(expense_type: :recurring, recurring_cycle: :yearly, renewal_month: @month.month)
                    .where("start_month <= ?", @month)
                    .where("end_month IS NULL OR end_month >= ?", @month)

    one_time.or(monthly).or(yearly)
  end

  def target_incomes
    Income.where("start_month <= ?", @month)
          .where("end_month IS NULL OR end_month >= ?", @month)
          .where(income_type: :recurring)
          .or(Income.where(income_type: :one_time, start_month: @month))
  end
end
