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

    it "creates card next_month expenses in the following calendar month" do
      card = create(:payment_method, method_type: "card", ledger_charge_timing: "next_month")
      create(:expense,
             minor_category: expense_minor,
             payment_method: card,
             expense_type: :recurring,
             recurring_cycle: :monthly,
             amount: 8_000,
             start_month: Date.new(2026, 1, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(Transaction.where(month: Date.new(2026, 7, 1), amount: -8_000).count).to eq(1)
      expect(Transaction.where(month: Date.new(2026, 6, 1)).where("amount < 0").count).to eq(0)
    end

    it "creates card same_month expenses in the accrual month" do
      card = create(:payment_method, method_type: "card", ledger_charge_timing: "same_month")
      create(:expense,
             minor_category: expense_minor,
             payment_method: card,
             expense_type: :recurring,
             recurring_cycle: :monthly,
             amount: 3_000,
             start_month: Date.new(2026, 1, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(Transaction.where(month: Date.new(2026, 6, 1), amount: -3_000).count).to eq(1)
    end

    it "creates bank_debit next_month expenses in the following calendar month" do
      bank = create(:payment_method, method_type: "bank_debit", ledger_charge_timing: "next_month")
      create(:expense,
             minor_category: expense_minor,
             payment_method: bank,
             expense_type: :recurring,
             recurring_cycle: :monthly,
             amount: 4_500,
             start_month: Date.new(2026, 1, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(Transaction.where(month: Date.new(2026, 7, 1), amount: -4_500).count).to eq(1)
    end

    it "rejects one_time scope without month" do
      post "/api/actuals/sync", params: { expense_scope: "one_time" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects invalid expense_scope" do
      post "/api/actuals/sync", params: { month: "2026-06-01", expense_scope: "bogus" }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "one_time scope only creates one_time expenses for the month" do
      pm = create(:payment_method, method_type: "card", ledger_charge_timing: "same_month")
      create(:expense,
             minor_category: expense_minor,
             payment_method: pm,
             expense_type: :one_time,
             amount: 100,
             start_month: Date.new(2026, 6, 1),
             end_month: Date.new(2026, 6, 1))
      create(:expense,
             minor_category: expense_minor,
             payment_method: pm,
             expense_type: :recurring,
             recurring_cycle: :monthly,
             amount: 9_999,
             start_month: Date.new(2026, 1, 1))

      post "/api/actuals/sync", params: { month: "2026-06-01", expense_scope: "one_time" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig("data", "created_expense_count")).to eq(1)
      expect(Transaction.where("amount < 0").count).to eq(1)
      expect(Transaction.where(amount: -100).count).to eq(1)
    end

    it "recurring scope uses today and next month and ignores month param" do
      travel_to Time.zone.local(2026, 5, 10) do
        pm = create(:payment_method, method_type: "card", ledger_charge_timing: "same_month")
        create(:expense,
               minor_category: expense_minor,
               payment_method: pm,
               expense_type: :recurring,
               recurring_cycle: :monthly,
               amount: 1_100,
               start_month: Date.new(2026, 1, 1))

        post "/api/actuals/sync", params: { month: "2020-01-01", expense_scope: "recurring" }, headers: headers
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body.dig("data", "months")).to eq([ "2026-05-01", "2026-06-01" ])
        expect(body.dig("data", "created_expense_count")).to eq(2)
      end
    end

    it "recurring scope does not create one_time for the same months" do
      travel_to Time.zone.local(2026, 5, 10) do
        pm = create(:payment_method, method_type: "card", ledger_charge_timing: "same_month")
        create(:expense,
               minor_category: expense_minor,
               payment_method: pm,
               expense_type: :one_time,
               amount: 50,
               start_month: Date.new(2026, 5, 1),
               end_month: Date.new(2026, 5, 1))
        create(:expense,
               minor_category: expense_minor,
               payment_method: pm,
               expense_type: :recurring,
               recurring_cycle: :monthly,
               amount: 2_200,
               start_month: Date.new(2026, 1, 1))

        post "/api/actuals/sync", params: { expense_scope: "recurring" }, headers: headers
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body).dig("data", "created_expense_count")).to eq(2)
        expect(Transaction.where(amount: -50).count).to eq(0)
        expect(Transaction.where(amount: -2_200).count).to eq(2)
      end
    end
  end
end
