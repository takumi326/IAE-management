module Api
  class PaymentMethodsController < ApplicationController
    def index
      payment_methods = PaymentMethod.order(:id)
      render json: { data: payment_methods.map { |pm| payment_method_json(pm) } }
    end

    private

    def payment_method_json(payment_method)
      payment_method.as_json(only: [ :id, :name, :method_type ])
    end
  end
end
