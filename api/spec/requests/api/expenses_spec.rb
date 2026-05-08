require "rails_helper"

RSpec.describe "Api::Expenses", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }
  let!(:major) { create(:major_category, kind: :expense) }
  let!(:minor) { create(:minor_category, major_category: major) }
  let!(:payment_method) { create(:payment_method, method_type: "card") }

  describe "GET /api/expenses" do
    it "returns expenses list" do
      create(:expense, minor_category: minor, payment_method: payment_method)

      get "/api/expenses", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["minor_category_id"]).to eq(minor.id)
    end
  end

  describe "POST /api/expenses" do
    it "creates an expense" do
      expect {
        post "/api/expenses",
             params: {
               expense: {
                 minor_category_id: minor.id,
                 payment_method_id: payment_method.id,
                 expense_type: "recurring",
                 recurring_cycle: "monthly",
                 renewal_month: nil,
                 amount: 12000,
                 start_month: "2026-05-01",
                 end_month: nil
               }
             },
             headers: headers
      }.to change(Expense, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["expense_type"]).to eq("recurring")
      expect(body["data"]["recurring_cycle"]).to eq("monthly")
      expect(body["data"]["amount"]).to eq(12000)
    end

    it "returns 422 for invalid params" do
      post "/api/expenses",
           params: { expense: { minor_category_id: minor.id, payment_method_id: payment_method.id } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/expenses/:id" do
    let!(:expense) { create(:expense, minor_category: minor, payment_method: payment_method) }

    it "updates an expense" do
      patch "/api/expenses/#{expense.id}",
            params: { expense: { expense_type: "recurring" } },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(expense.reload.expense_type).to eq("recurring")
    end

    it "returns 404 for missing expense" do
      patch "/api/expenses/0",
            params: { expense: { expense_type: "recurring" } },
            headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/expenses/:id" do
    let!(:expense) { create(:expense, minor_category: minor, payment_method: payment_method) }

    it "destroys an expense" do
      expect {
        delete "/api/expenses/#{expense.id}", headers: headers
      }.to change(Expense, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end

  describe "GET /api/expenses/:id/actuals" do
    it "returns actual transaction list for expense" do
      expense = create(:expense, minor_category: minor, payment_method: payment_method)
      tx = Transaction.create!(month: Date.new(2026, 6, 1), amount: -12_000)
      ExpenseTransaction.create!(expense: expense, ledger_transaction: tx)

      get "/api/expenses/#{expense.id}/actuals", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["month"]).to eq("2026-06-01")
      expect(body["data"].first["amount"]).to eq("12000.0")
    end
  end
end
