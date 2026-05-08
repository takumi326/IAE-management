module Api
  class IncomesController < ApplicationController
    before_action :set_income, only: [ :update, :destroy, :actuals ]
    before_action :ensure_income!, only: [ :update, :destroy, :actuals ]

    def index
      incomes = Income.joins(:minor_category)
                      .preload(:minor_category)
                      .order(Arel.sql("minor_categories.name ASC, incomes.id ASC"))
      render json: { data: incomes.map { |i| income_json(i) } }
    end

    def create
      income = Income.new(income_params)
      if income.save
        render json: { data: income_json(income) }, status: :created
      else
        render_validation_error(income)
      end
    end

    def update
      if @income.update(income_params)
        render json: { data: income_json(@income) }
      else
        render_validation_error(@income)
      end
    end

    def destroy
      @income.destroy!
      head :no_content
    end

    def actuals
      rows = @income.income_transactions
                    .joins(:ledger_transaction)
                    .includes(:ledger_transaction)
                    .order(Arel.sql("transactions.month ASC, income_transactions.id ASC"))
      render json: {
        data: rows.map do |row|
          tx = row.ledger_transaction
          {
            transaction_id: tx.id,
            month: tx.month,
            amount: tx.amount
          }
        end
      }
    end

    private

    def set_income
      @income = Income.find_by(id: params[:id])
    end

    def ensure_income!
      return if @income.present?

      render json: { error: { code: "not_found", message: "Income not found" } }, status: :not_found
    end

    def income_params
      params.expect(income: [ :minor_category_id, :income_type, :amount, :start_month, :end_month ])
    end

    def income_json(income)
      income.as_json(only: [ :id, :minor_category_id, :income_type, :amount, :start_month, :end_month ])
    end

    def render_validation_error(income)
      render json: { error: { code: "validation_error", message: "Invalid income params", details: income.errors } },
             status: :unprocessable_entity
    end
  end
end
