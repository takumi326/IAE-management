module Api
  class IncomesController < ApplicationController
    before_action :set_income, only: [:update, :destroy]
    before_action :ensure_income!, only: [:update, :destroy]

    def index
      incomes = Income.preload(:minor_category).order(:id)
      render json: { data: incomes.map { |i| income_json(i) } }
    end

    def create
      income = Income.new(income_params)
      if income.save
        render json: { data: income_json(income) }, status: :created
      else
        render json: { error: { code: "validation_error", message: "Invalid income params", details: income.errors } },
               status: :unprocessable_entity
      end
    end

    def update
      if @income.update(income_params)
        render json: { data: income_json(@income) }
      else
        render json: { error: { code: "validation_error", message: "Invalid income params", details: @income.errors } },
               status: :unprocessable_entity
      end
    end

    def destroy
      if @income.destroy
        head :no_content
      else
        render json: { error: { code: "conflict", message: "Income is referenced by transactions" } }, status: :conflict
      end
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
      params.expect(income: [:minor_category_id, :income_type, :start_month, :end_month])
    end

    def income_json(income)
      income.as_json(only: [:id, :minor_category_id, :income_type, :start_month, :end_month])
    end
  end
end
