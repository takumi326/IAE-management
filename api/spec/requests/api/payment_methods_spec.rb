require "rails_helper"

RSpec.describe "Api::PaymentMethods", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/payment_methods" do
    it "returns payment methods list" do
      create(:payment_method, name: "PayPayカード", method_type: "card")
      create(:payment_method, name: "みずほ口座引落", method_type: "bank_debit")

      get "/api/payment_methods", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(2)
      expect(body["data"].pluck("method_type")).to contain_exactly("card", "bank_debit")
    end
  end
end
