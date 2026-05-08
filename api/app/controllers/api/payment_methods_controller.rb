module Api
  class PaymentMethodsController < ApplicationController
    def index
      payment_methods = PaymentMethod.order(:id)
      render json: { data: payment_methods.map { |pm| payment_method_json(pm) } }
    end

    def create
      payment_method = PaymentMethod.new(payment_method_params)
      if payment_method.save
        render json: { data: payment_method_json(payment_method) }, status: :created
      else
        render json: { error: { code: "validation_error", message: "Invalid payment method params", details: payment_method.errors } },
               status: :unprocessable_entity
      end
    end

    private

    def payment_method_params
      params.expect(payment_method: [ :name, :method_type, :closing_day, :debit_day ])
    end

    def payment_method_json(payment_method)
      payment_method.as_json(only: [ :id, :name, :method_type, :closing_day, :debit_day ])
    end
  end
end
