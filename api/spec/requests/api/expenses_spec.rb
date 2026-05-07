require "rails_helper"

RSpec.describe "Api::Expenses", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }
  let!(:major) { create(:major_category, kind: :expense) }
  let!(:minor) { create(:minor_category, major_category: major) }
  let!(:payment_method) { create(:payment_method, method_type: "card") }

  describe "GET /api/expenses" do
    it "returns expenses list" do
      Expense.create!(
        minor_category: minor,
        payment_method: payment_method,
        expense_type: :one_time,
        start_month: Date.new(2026, 5, 1)
      )

      get "/api/expenses", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(1)
      expect(body["data"].first["minor_category_id"]).to eq(minor.id)
    end
  end

  describe "POST /api/expenses" do
    it "creates an expense" do
      expect do
        post "/api/expenses", params: {
          expense: {
            minor_category_id: minor.id,
            payment_method_id: payment_method.id,
            expense_type: "one_time",
            start_month: "2026-05-01",
            end_month: nil
          }
        }, headers: headers
      end.to change(Expense, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns validation error when invalid" do
      post "/api/expenses", params: {
        expense: {
          minor_category_id: minor.id,
          payment_method_id: payment_method.id,
          expense_type: "one_time",
          start_month: "2026-06-01",
          end_month: "2026-05-01"
        }
      }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      body = JSON.parse(response.body)
      expect(body.dig("error", "code")).to eq("validation_error")
    end
  end

  describe "PATCH /api/expenses/:id" do
    let!(:expense) do
      Expense.create!(
        minor_category: minor,
        payment_method: payment_method,
        expense_type: :one_time,
        start_month: Date.new(2026, 5, 1)
      )
    end

    it "updates an expense" do
      patch "/api/expenses/#{expense.id}", params: {
        expense: {
          expense_type: "recurring",
          end_month: "2026-12-01"
        }
      }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(expense.reload.expense_type).to eq("recurring")
      expect(expense.end_month).to eq(Date.new(2026, 12, 1))
    end

    it "returns not found for missing record" do
      patch "/api/expenses/999999", params: { expense: { expense_type: "one_time" } }, headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/expenses/:id" do
    let!(:expense) do
      Expense.create!(
        minor_category: minor,
        payment_method: payment_method,
        expense_type: :one_time,
        start_month: Date.new(2026, 5, 1)
      )
    end

    it "deletes an expense" do
      expect do
        delete "/api/expenses/#{expense.id}", headers: headers
      end.to change(Expense, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
