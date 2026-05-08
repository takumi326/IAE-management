require "rails_helper"

RSpec.describe "Api::Expenses", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }
  let!(:major) { create(:major_category, kind: :expense) }
  let!(:minor) { create(:minor_category, major_category: major) }
  let!(:payment_method) { create(:payment_method, method_type: "card") }

  describe "GET /api/expenses" do
    it "returns expenses list" do
      Expense.create!(
        minor_category: minor,
        payment_method: payment_method,
        expense_type: :one_time,
        start_month: Date.new(2026, 5, 1)
      )

      get "/api/expenses", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["minor_category_id"]).to eq(minor.id)
    end
  end
end
