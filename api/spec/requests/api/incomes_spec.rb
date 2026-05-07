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

  describe "POST /api/incomes" do
    it "creates an income" do
      expect do
        post "/api/incomes", params: {
          income: {
            minor_category_id: minor.id,
            income_type: "one_time",
            start_month: "2026-05-01",
            end_month: nil
          }
        }, headers: headers
      end.to change(Income, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns validation error when invalid" do
      post "/api/incomes", params: {
        income: {
          minor_category_id: minor.id,
          income_type: "one_time",
          start_month: "2026-06-01",
          end_month: "2026-05-01"
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      body = JSON.parse(response.body)
      expect(body.dig("error", "code")).to eq("validation_error")
    end
  end

  describe "PATCH /api/incomes/:id" do
    let!(:income) { create(:income, minor_category: minor) }

    it "updates an income" do
      patch "/api/incomes/#{income.id}", params: {
        income: {
          income_type: "recurring",
          end_month: "2026-12-01"
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(income.reload.income_type).to eq("recurring")
      expect(income.end_month).to eq(Date.new(2026, 12, 1))
    end

    it "returns not found for missing record" do
      patch "/api/incomes/999999", params: { income: { income_type: "one_time" } }, headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/incomes/:id" do
    let!(:income) { create(:income, minor_category: minor) }

    it "deletes an income" do
      expect do
        delete "/api/incomes/#{income.id}", headers: headers
      end.to change(Income, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
