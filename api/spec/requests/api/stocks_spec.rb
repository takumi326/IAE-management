# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::Stocks", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/stocks" do
    it "returns an empty list when no stocks exist" do
      get "/api/stocks", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]).to eq([])
    end
  end
end
