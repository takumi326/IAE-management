module Api
  class ExpensesController < ApplicationController
    def index
      expenses = Expense.preload(:minor_category, :payment_method).order(:id)
      render json: { data: expenses.map { |e| expense_json(e) } }
    end

    private

    def expense_json(expense)
      expense.as_json(only: [ :id, :minor_category_id, :payment_method_id, :expense_type, :start_month, :end_month ])
    end
  end
end
