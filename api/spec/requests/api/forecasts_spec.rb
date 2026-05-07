require "rails_helper"

RSpec.describe "Api::Forecasts", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/forecasts" do
    it "returns forecasts list" do
      create(:forecast, kind: :expense, month: Date.new(2026, 5, 1), amount: 100_000)

      get "/api/forecasts", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["kind"]).to eq("expense")
    end
  end

  describe "POST /api/forecasts" do
    it "creates a forecast" do
      expect do
        post "/api/forecasts", params: {
          forecast: {
            kind: "income",
            month: "2026-06-01",
            amount: 350000
          }
        }, headers: headers
      end.to change(Forecast, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns validation error when duplicated month and kind" do
      create(:forecast, kind: :income, month: Date.new(2026, 6, 1))

      post "/api/forecasts", params: {
        forecast: {
          kind: "income",
          month: "2026-06-01",
          amount: 360000
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      body = JSON.parse(response.body)
      expect(body.dig("error", "code")).to eq("validation_error")
    end
  end

  describe "PATCH /api/forecasts/:id" do
    let!(:forecast) { create(:forecast, kind: :expense, month: Date.new(2026, 5, 1), amount: 100_000) }

    it "updates a forecast" do
      patch "/api/forecasts/#{forecast.id}", params: {
        forecast: {
          amount: 120000
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(forecast.reload.amount).to eq(120000)
    end

    it "returns not found for missing record" do
      patch "/api/forecasts/999999", params: { forecast: { amount: 10_000 } }, headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/forecasts/:id" do
    let!(:forecast) { create(:forecast) }

    it "deletes a forecast" do
      expect do
        delete "/api/forecasts/#{forecast.id}", headers: headers
      end.to change(Forecast, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
