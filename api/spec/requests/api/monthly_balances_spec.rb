require "rails_helper"

RSpec.describe "Api::MonthlyBalances", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/monthly_balances" do
    it "returns existing monthly balance for target month" do
      MonthlyBalance.create!(month: Date.new(2026, 6, 1), amount: 800_000)

      get "/api/monthly_balances", params: { month: "2026-06-01" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.fetch("data").size).to eq(1)
      expect(body.dig("data", 0, "month")).to eq("2026-06-01")
      expect(body.dig("data", 0, "amount").to_f).to eq(800_000.0)
    end

    it "returns zero amount when the month has no record" do
      get "/api/monthly_balances", params: { month: "2026-08-01" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", 0, "month")).to eq("2026-08-01")
      expect(body.dig("data", 0, "amount").to_f).to eq(0.0)
    end
  end

  describe "POST /api/monthly_balances/upsert" do
    it "creates and updates monthly balance for the same month" do
      post "/api/monthly_balances/upsert",
           params: { monthly_balance: { month: "2026-06-01", amount: 1_000_000 } },
           headers: headers

      expect(response).to have_http_status(:ok)
      expect(MonthlyBalance.count).to eq(1)
      expect(MonthlyBalance.last.amount.to_i).to eq(1_000_000)

      post "/api/monthly_balances/upsert",
           params: { monthly_balance: { month: "2026-06-01", amount: 1_111_111 } },
           headers: headers

      expect(response).to have_http_status(:ok)
      expect(MonthlyBalance.count).to eq(1)
      expect(MonthlyBalance.last.amount.to_i).to eq(1_111_111)
    end
  end
end
