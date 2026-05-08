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
      expect {
        post "/api/incomes",
             params: {
               income: {
                 minor_category_id: minor.id,
                 income_type: "recurring",
                 amount: 320000,
                 start_month: "2026-05-01",
                 end_month: nil
               }
             },
             headers: headers
      }.to change(Income, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["income_type"]).to eq("recurring")
      expect(body["data"]["amount"]).to eq(320000)
    end

    it "returns 422 for invalid params" do
      post "/api/incomes",
           params: { income: { minor_category_id: minor.id } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/incomes/:id" do
    let!(:income) { create(:income, minor_category: minor) }

    it "updates an income" do
      patch "/api/incomes/#{income.id}",
            params: { income: { income_type: "recurring" } },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(income.reload.income_type).to eq("recurring")
    end

    it "returns 404 for missing income" do
      patch "/api/incomes/0",
            params: { income: { income_type: "recurring" } },
            headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/incomes/:id" do
    let!(:income) { create(:income, minor_category: minor) }

    it "destroys an income" do
      expect {
        delete "/api/incomes/#{income.id}", headers: headers
      }.to change(Income, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "GET /api/incomes/:id/actuals" do
    it "returns actual transaction list for income" do
      income = create(:income, minor_category: minor)
      tx = Transaction.create!(month: Date.new(2026, 6, 1), amount: 320_000)
      IncomeTransaction.create!(income: income, ledger_transaction: tx)

      get "/api/incomes/#{income.id}/actuals", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["month"]).to eq("2026-06-01")
      expect(body["data"].first["amount"]).to eq(320000.0)
    end
  end
end
