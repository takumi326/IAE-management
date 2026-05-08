module Api
  class IncomesController < ApplicationController
    def index
      incomes = Income.preload(:minor_category).order(:id)
      render json: { data: incomes.map { |i| income_json(i) } }
    end

    private

    def income_json(income)
      income.as_json(only: [ :id, :minor_category_id, :income_type, :start_month, :end_month ])
    end
  end
end
