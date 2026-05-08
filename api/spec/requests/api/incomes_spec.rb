require "rails_helper"

RSpec.describe "Api::Incomes", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }
  let!(:major) { create(:major_category, kind: :income) }
  let!(:minor) { create(:minor_category, major_category: major) }

  describe "GET /api/incomes" do
    it "returns incomes list" do
      create(:income, minor_category: minor)

      get "/api/incomes", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["minor_category_id"]).to eq(minor.id)
    end
  end
end
