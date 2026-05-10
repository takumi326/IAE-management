require "rails_helper"

RSpec.describe "Api::ForecastDefaults", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/forecast_defaults" do
    it "returns singleton defaults" do
      ForecastDefault.destroy_all
      ForecastDefault.create!(expense_amount: 100, income_amount: 200)

      get "/api/forecast_defaults", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "expense_amount")).to eq(100)
      expect(body.dig("data", "income_amount")).to eq(200)
    end
  end

  describe "PATCH /api/forecast_defaults" do
    it "updates amounts" do
      ForecastDefault.instance

      patch "/api/forecast_defaults",
            params: { forecast_default: { expense_amount: 150_000, income_amount: 400_000 } },
            headers: headers

      expect(response).to have_http_status(:ok)
      rec = ForecastDefault.instance.reload
      expect(rec.expense_amount.to_i).to eq(150_000)
      expect(rec.income_amount.to_i).to eq(400_000)
    end
  end
end
