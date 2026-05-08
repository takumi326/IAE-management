module Api
  class ExpensesController < ApplicationController
    before_action :set_expense, only: [ :update, :destroy, :actuals ]
    before_action :ensure_expense!, only: [ :update, :destroy, :actuals ]

    def index
      expenses = Expense.joins(:minor_category)
                        .preload(:minor_category, :payment_method)
                        .order(Arel.sql("minor_categories.name ASC, expenses.id ASC"))
      render json: { data: expenses.map { |e| expense_json(e) } }
    end

    def create
      expense = Expense.new(expense_params)
      if expense.save
        render json: { data: expense_json(expense) }, status: :created
      else
        render_validation_error(expense)
      end
    end

    def update
      if @expense.update(expense_params)
        render json: { data: expense_json(@expense) }
      else
        render_validation_error(@expense)
      end
    end

    def destroy
      @expense.destroy!
      head :no_content
    end

    def actuals
      rows = @expense.expense_transactions
                     .joins(:ledger_transaction)
                     .includes(:ledger_transaction)
                     .order(Arel.sql("transactions.month ASC, expense_transactions.id ASC"))
      render json: {
        data: rows.map do |row|
          tx = row.ledger_transaction
          {
            transaction_id: tx.id,
            month: tx.month,
            amount: tx.amount.to_d.abs
          }
        end
      }
    end

    private

    def set_expense
      @expense = Expense.find_by(id: params[:id])
    end

    def ensure_expense!
      return if @expense.present?

      render json: { error: { code: "not_found", message: "Expense not found" } }, status: :not_found
    end

    def expense_params
      params.expect(expense: [ :minor_category_id, :payment_method_id, :expense_type, :recurring_cycle, :renewal_month, :amount, :start_month, :end_month ])
    end

    def expense_json(expense)
      expense.as_json(only: [ :id, :minor_category_id, :payment_method_id, :expense_type, :recurring_cycle, :renewal_month, :amount, :start_month, :end_month ])
    end

    def render_validation_error(expense)
      render json: { error: { code: "validation_error", message: "Invalid expense params", details: expense.errors } },
             status: :unprocessable_entity
    end
  end
end
