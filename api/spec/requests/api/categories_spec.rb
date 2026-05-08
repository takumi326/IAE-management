require "rails_helper"

RSpec.describe "Api::Categories", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/categories/majors" do
    it "returns major categories filtered by kind" do
      expense_major = create(:major_category, kind: :expense, name: "食費")
      create(:major_category, kind: :income, name: "給与")

      get "/api/categories/majors", params: { kind: "expense" }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].pluck("id")).to contain_exactly(expense_major.id)
    end
  end

  describe "GET /api/categories/minors" do
    it "returns minor categories filtered by major_category_id" do
      major = create(:major_category, kind: :expense)
      target_minor = create(:minor_category, major_category: major, name: "外食")
      other_major = create(:major_category, kind: :expense)
      create(:minor_category, major_category: other_major)

      get "/api/categories/minors", params: { major_category_id: major.id }, headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"].pluck("id")).to contain_exactly(target_minor.id)
    end
  end

  describe "POST /api/categories/majors" do
    it "creates a major category" do
      expect {
        post "/api/categories/majors",
             params: { major_category: { kind: "expense", name: "新カテゴリ" } },
             headers: headers
      }.to change(MajorCategory, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["name"]).to eq("新カテゴリ")
      expect(body["data"]["kind"]).to eq("expense")
    end

    it "returns 422 for invalid params" do
      post "/api/categories/majors",
           params: { major_category: { kind: "expense", name: "" } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/categories/minors" do
    let!(:major) { create(:major_category, kind: :expense) }

    it "creates a minor category" do
      expect {
        post "/api/categories/minors",
             params: { minor_category: { major_category_id: major.id, name: "サブカテゴリ" } },
             headers: headers
      }.to change(MinorCategory, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["data"]["name"]).to eq("サブカテゴリ")
      expect(body["data"]["major_category"]["id"]).to eq(major.id)
    end

    it "returns 422 for invalid params" do
      post "/api/categories/minors",
           params: { minor_category: { major_category_id: major.id, name: "" } },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/categories/majors/:id" do
    it "updates a major category" do
      major = create(:major_category, kind: :expense, name: "旧カテゴリ")

      patch "/api/categories/majors/#{major.id}",
            params: { major_category: { kind: "expense", name: "新カテゴリ" } },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(major.reload.name).to eq("新カテゴリ")
    end
  end

  describe "PATCH /api/categories/minors/:id" do
    it "updates a minor category" do
      major = create(:major_category, kind: :expense, name: "食費")
      other_major = create(:major_category, kind: :expense, name: "趣味")
      minor = create(:minor_category, major_category: major, name: "外食")

      patch "/api/categories/minors/#{minor.id}",
            params: { minor_category: { major_category_id: other_major.id, name: "ゲーム課金" } },
            headers: headers

      expect(response).to have_http_status(:ok)
      minor.reload
      expect(minor.name).to eq("ゲーム課金")
      expect(minor.major_category_id).to eq(other_major.id)
    end
  end

  describe "DELETE /api/categories/majors/:id" do
    it "destroys an unreferenced major category" do
      major = create(:major_category, kind: :expense)

      expect {
        delete "/api/categories/majors/#{major.id}", headers: headers
      }.to change(MajorCategory, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "returns 422 when major has minors" do
      major = create(:major_category, kind: :expense)
      create(:minor_category, major_category: major)

      delete "/api/categories/majors/#{major.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/categories/minors/:id" do
    it "destroys an unreferenced minor category" do
      minor = create(:minor_category)

      expect {
        delete "/api/categories/minors/#{minor.id}", headers: headers
      }.to change(MinorCategory, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "returns 422 when minor is referenced by expense" do
      major = create(:major_category, kind: :expense)
      minor = create(:minor_category, major_category: major)
      payment_method = create(:payment_method)
      create(:expense, minor_category: minor, payment_method: payment_method)

      delete "/api/categories/minors/#{minor.id}", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
