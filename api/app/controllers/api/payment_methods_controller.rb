module Api
  class PaymentMethodsController < ApplicationController
    before_action :set_payment_method, only: [ :update, :destroy ]
    before_action :ensure_payment_method!, only: [ :update, :destroy ]

    def index
      payment_methods = PaymentMethod.order(:name, :id)
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

    def update
      if @payment_method.update(payment_method_params)
        render json: { data: payment_method_json(@payment_method) }
      else
        render json: { error: { code: "validation_error", message: "Invalid payment method params", details: @payment_method.errors } },
               status: :unprocessable_entity
      end
    end

    def destroy
      @payment_method.destroy!
      head :no_content
    rescue ActiveRecord::DeleteRestrictionError
      render json: { error: { code: "conflict", message: "Payment method is referenced by expenses" } }, status: :unprocessable_entity
    end

    private

    def set_payment_method
      @payment_method = PaymentMethod.find_by(id: params[:id])
    end

    def ensure_payment_method!
      return if @payment_method.present?

      render json: { error: { code: "not_found", message: "Payment method not found" } }, status: :not_found
    end

    def payment_method_params
      params.expect(payment_method: [ :name, :method_type, :closing_day, :debit_day, :ledger_charge_timing ])
    end

    def payment_method_json(payment_method)
      payment_method.as_json(only: [ :id, :name, :method_type, :closing_day, :debit_day, :ledger_charge_timing ])
    end
  end
end
