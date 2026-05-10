require "rails_helper"

RSpec.describe "Api::Actuals", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:headers) { { "HOST" => "www.example.com" } }
  let!(:expense_major) { create(:major_category, kind: :expense) }
  let!(:income_major) { create(:major_category, kind: :income) }
  let!(:expense_minor) { create(:minor_category, major_category: expense_major) }
  let!(:income_minor) { create(:minor_category, major_category: income_major) }
  let!(:payment_method) { create(:payment_method) }

  describe "POST /api/actuals/sync" do
    it "creates transactions for target month and is idempotent" do
      create(:expense,
             minor_category: expense_minor,
             payment_method: payment_method,
             expense_type: :recurring,
             amount: 12_000,
             start_month: Date.new(2026, 1, 1))
      create(:income,
             minor_category: income_minor,
             income_type: :one_time,
             amount: 300_000,
             start_month: Date.new(2026, 6, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "created_expense_count")).to eq(1)
      expect(body.dig("data", "created_income_count")).to eq(1)
      expect(Transaction.count).to eq(2)

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "created_expense_count")).to eq(0)
      expect(body.dig("data", "created_income_count")).to eq(0)
      expect(Transaction.count).to eq(2)
    end

    it "creates yearly recurring expense only on renewal month" do
      create(:expense,
             minor_category: expense_minor,
             payment_method: payment_method,
             expense_type: :recurring,
             recurring_cycle: :yearly,
             renewal_month: 7,
             amount: 50_000,
             start_month: Date.new(2026, 1, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig("data", "created_expense_count")).to eq(0)

      post "/api/actuals/sync", params: { month: "2026-07-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig("data", "created_expense_count")).to eq(1)
    end

    it "without month syncs current and next month" do
      travel_to Time.zone.local(2026, 5, 10) do
        create(:expense,
               minor_category: expense_minor,
               payment_method: payment_method,
               expense_type: :recurring,
               recurring_cycle: :monthly,
               amount: 5_000,
               start_month: Date.new(2026, 1, 1))

        post "/api/actuals/sync", headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body.dig("data", "months")).to eq([ "2026-05-01", "2026-06-01" ])
        expect(body.dig("data", "created_expense_count")).to eq(2)
        expect(body.dig("data", "created_income_count")).to eq(0)

        post "/api/actuals/sync", headers: headers
        expect(JSON.parse(response.body).dig("data", "created_expense_count")).to eq(0)
      end
    end
  end
end
