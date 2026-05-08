require "rails_helper"

RSpec.describe "Api::Forecasts", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/forecasts" do
    it "returns forecasts list" do
      create(:forecast, kind: :expense, month: Date.new(2026, 5, 1), amount: 200_000)
      create(:forecast, kind: :income, month: Date.new(2026, 5, 1), amount: 320_000)

      get "/api/forecasts", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(2)
      expect(body["data"].pluck("kind")).to contain_exactly("expense", "income")
    end
  end

  describe "POST /api/forecasts/upsert" do
    it "creates a forecast when not present" do
      expect {
        post "/api/forecasts/upsert",
             params: { forecast: { kind: "expense", month: "2026-05-01", amount: 250_000 } },
             headers: headers
      }.to change(Forecast, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["amount"]).to eq("250000.0").or eq(250_000)
    end

    it "updates an existing forecast" do
      create(:forecast, kind: :expense, month: Date.new(2026, 5, 1), amount: 100_000)

      expect {
        post "/api/forecasts/upsert",
             params: { forecast: { kind: "expense", month: "2026-05-01", amount: 200_000 } },
             headers: headers
      }.not_to change(Forecast, :count)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["amount"]).to eq("200000.0").or eq(200_000)
    end

    it "returns 422 for invalid params" do
      post "/api/forecasts/upsert",
           params: { forecast: { kind: "expense", month: "2026-05-01", amount: nil } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
