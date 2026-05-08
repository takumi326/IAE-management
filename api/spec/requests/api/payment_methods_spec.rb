require "rails_helper"

RSpec.describe "Api::PaymentMethods", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/payment_methods" do
    it "returns payment methods list" do
      create(:payment_method, name: "PayPayカード", method_type: "card", closing_day: nil, debit_day: 27)
      create(:payment_method, name: "みずほ口座引落", method_type: "bank_debit", debit_day: 26)

      get "/api/payment_methods", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].size).to eq(2)
      expect(body["data"].pluck("method_type").sort).to eq([ "bank_debit", "card" ].sort)
      card = body["data"].find { |r| r["name"] == "PayPayカード" }
      expect(card["closing_day"]).to be_nil
      expect(card["debit_day"]).to eq(27)
    end
  end

  describe "POST /api/payment_methods" do
    it "creates a credit card with 締め/引落" do
      expect {
        post "/api/payment_methods",
             params: {
               payment_method: {
                 name: "楽天カード",
                 method_type: "card",
                 closing_day: nil,
                 debit_day: 27
               }
             },
             headers: headers
      }.to change(PaymentMethod, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["method_type"]).to eq("card")
      expect(body["data"]["closing_day"]).to be_nil
      expect(body["data"]["debit_day"]).to eq(27)
    end

    it "creates bank_debit and ignores closing_day" do
      post "/api/payment_methods",
           params: {
             payment_method: {
               name: "保険",
               method_type: "bank_debit",
               closing_day: 15,
               debit_day: 8
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      pm = PaymentMethod.order(:id).last
      expect(pm.method_type).to eq("bank_debit")
      expect(pm.closing_day).to be_nil
      expect(pm.debit_day).to eq(8)
    end

    it "creates bank_withdrawal and ignores closing_day" do
      post "/api/payment_methods",
           params: {
             payment_method: {
               name: "ATM引き出し",
               method_type: "bank_withdrawal",
               closing_day: 20,
               debit_day: 12
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      pm = PaymentMethod.order(:id).last
      expect(pm.method_type).to eq("bank_withdrawal")
      expect(pm.closing_day).to be_nil
      expect(pm.debit_day).to be_nil
    end

    it "returns 422 for invalid day" do
      post "/api/payment_methods",
           params: {
             payment_method: { name: "bad", method_type: "card", closing_day: 40, debit_day: 27 }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 for invalid params" do
      post "/api/payment_methods",
           params: { payment_method: { name: "" } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/payment_methods/:id" do
    it "updates payment method" do
      pm = create(:payment_method, name: "楽天カード", method_type: "card", closing_day: nil, debit_day: 27)

      patch "/api/payment_methods/#{pm.id}",
            params: {
              payment_method: {
                name: "楽天カード改",
                method_type: "bank_withdrawal",
                closing_day: 20,
                debit_day: 15
              }
            },
            headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["name"]).to eq("楽天カード改")
      expect(body["data"]["method_type"]).to eq("bank_withdrawal")
      expect(body["data"]["closing_day"]).to be_nil
      expect(body["data"]["debit_day"]).to be_nil
    end
  end

  describe "DELETE /api/payment_methods/:id" do
    it "destroys an unreferenced payment method" do
      pm = create(:payment_method)

      expect {
        delete "/api/payment_methods/#{pm.id}", headers: headers
      }.to change(PaymentMethod, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "returns 422 when referenced by expenses" do
      pm = create(:payment_method)
      minor = create(:minor_category, major_category: create(:major_category, kind: :expense))
      create(:expense, minor_category: minor, payment_method: pm)

      delete "/api/payment_methods/#{pm.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
