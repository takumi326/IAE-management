require "rails_helper"

RSpec.describe "Api::Dashboard", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }
  let(:month) { Date.new(2026, 6, 1) }

  describe "GET /api/dashboard" do
    it "returns expense breakdowns and monthly balance for the target month" do
      expense_major = create(:major_category, kind: :expense, name: "固定費")
      expense_minor_a = create(:minor_category, major_category: expense_major, name: "サブスク")
      expense_minor_b = create(:minor_category, major_category: expense_major, name: "通信")
      income_minor = create(:minor_category, major_category: create(:major_category, kind: :income))
      card = create(:payment_method, name: "楽天カード")

      expense_a = create(:expense, minor_category: expense_minor_a, payment_method: card)
      expense_b = create(:expense, minor_category: expense_minor_b, payment_method: card)
      income = create(:income, minor_category: income_minor)

      tx_expense_a = Transaction.create!(month: month, amount: -3_000)
      tx_expense_b = Transaction.create!(month: month, amount: -2_000)
      tx_income = Transaction.create!(month: month, amount: 100_000)
      tx_other_month = Transaction.create!(month: Date.new(2026, 5, 1), amount: -9_999)

      ExpenseTransaction.create!(expense: expense_a, ledger_transaction: tx_expense_a)
      ExpenseTransaction.create!(expense: expense_b, ledger_transaction: tx_expense_b)
      IncomeTransaction.create!(income: income, ledger_transaction: tx_income)
      ExpenseTransaction.create!(expense: expense_a, ledger_transaction: tx_other_month)

      MonthlyBalance.create!(month: month, amount: 1_234_567)

      get "/api/dashboard", params: { month: month.to_s }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      data = body.fetch("data")

      expect(data.fetch("month")).to eq("2026-06-01")

      by_payment = data.fetch("expense_by_payment")
      expect(by_payment.size).to eq(1)
      expect(by_payment.first.fetch("label")).to eq("楽天カード")
      expect(by_payment.first.fetch("mode")).to eq("実")
      expect(by_payment.first.fetch("amount").to_f).to eq(5_000.0)

      groups = data.fetch("expense_by_category_groups")
      expect(groups.size).to eq(1)
      expect(groups.first.fetch("major")).to eq("固定費")
      expect(groups.first.fetch("mode")).to eq("実")
      minors = groups.first.fetch("minors")
      expect(minors.map { |row| row.fetch("label") }).to eq([ "サブスク", "通信" ])
      expect(minors.sum { |row| row.fetch("amount").to_f }).to eq(5_000.0)

      expect(data.fetch("monthly_balance").to_f).to eq(1_234_567.0)
    end
  end

  describe "GET /api/dashboard/fiscal_actuals" do
    it "returns per-month ledger flags and totals for the fiscal year of anchor month" do
      expense_major = create(:major_category, kind: :expense)
      expense_minor = create(:minor_category, major_category: expense_major)
      income_minor = create(:minor_category, major_category: create(:major_category, kind: :income))
      card = create(:payment_method)
      expense = create(:expense, minor_category: expense_minor, payment_method: card)
      income = create(:income, minor_category: income_minor)

      june = Date.new(2026, 6, 1)
      tx_e = Transaction.create!(month: june, amount: -4_000)
      tx_i = Transaction.create!(month: june, amount: 50_000)
      ExpenseTransaction.create!(expense: expense, ledger_transaction: tx_e)
      IncomeTransaction.create!(income: income, ledger_transaction: tx_i)

      get "/api/dashboard/fiscal_actuals", params: { month: "2026-06-01" }, headers: headers

      expect(response).to have_http_status(:ok)
      rows = JSON.parse(response.body).fetch("data")
      expect(rows.size).to eq(12)
      june_row = rows.find { |r| r.fetch("month") == "2026-06-01" }
      expect(june_row.fetch("has_expense_actual")).to be(true)
      expect(june_row.fetch("has_income_actual")).to be(true)
      expect(june_row.fetch("expense_actual").to_i).to eq(4_000)
      expect(june_row.fetch("income_actual").to_i).to eq(50_000)
      expect(june_row.fetch("has_monthly_balance")).to be(false)
      expect(june_row.fetch("monthly_balance_amount")).to be_nil

      MonthlyBalance.create!(month: june, amount: 999_000)
      get "/api/dashboard/fiscal_actuals", params: { month: "2026-06-01" }, headers: headers
      june_with_balance = JSON.parse(response.body).fetch("data").find { |r| r.fetch("month") == "2026-06-01" }
      expect(june_with_balance.fetch("has_monthly_balance")).to be(true)
      expect(june_with_balance.fetch("monthly_balance_amount").to_f).to eq(999_000.0)

      april_row = rows.find { |r| r.fetch("month") == "2026-04-01" }
      expect(april_row.fetch("has_expense_actual")).to be(false)
      expect(april_row.fetch("expense_actual").to_i).to eq(0)
      expect(april_row.fetch("has_monthly_balance")).to be(false)
    end
  end
end
