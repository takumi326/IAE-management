# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::StockTradeEvents", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/stock_trade_events" do
    it "returns 200 with zero total when there are no exits" do
      get "/api/stock_trade_events",
          params: { trade_type: "real", judgment_type: "human", event_kind: "all" },
          headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["rows"]).to eq([])
      expect(body["data"]["total_realized_pl"]).to eq("0.0")
    end

    it "returns 400 for missing trade_type" do
      get "/api/stock_trade_events",
          params: { judgment_type: "human", event_kind: "all" },
          headers: headers

      expect(response).to have_http_status(:bad_request)
    end
  end
end
