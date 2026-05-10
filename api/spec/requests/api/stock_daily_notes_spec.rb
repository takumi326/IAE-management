require "rails_helper"

RSpec.describe "Api::StockDailyNotes", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/stock_daily_notes" do
    it "returns an empty array when no rows exist" do
      get "/api/stock_daily_notes", headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"]).to eq([])
    end

    it "returns notes for the development owner key" do
      StockDailyNote.create!(
        owner_key: "development",
        recorded_on: Date.new(2026, 5, 1),
        hypothesis: "上昇想定",
        result: "",
        sector_research: "商社を確認"
      )

      get "/api/stock_daily_notes", headers: headers

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)["data"]
      expect(data.length).to eq(1)
      expect(data.first["recorded_on"]).to eq("2026-05-01")
      expect(data.first["hypothesis"]).to eq("上昇想定")
      expect(data.first["result"]).to eq("")
      expect(data.first["sector_research"]).to eq("商社を確認")
    end
  end

  describe "POST /api/stock_daily_notes/upsert" do
    it "creates a new row" do
      post "/api/stock_daily_notes/upsert",
           params: {
             stock_daily_note: {
               recorded_on: "2026-05-10",
               hypothesis: "仮説本文",
               result: "結果",
               sector_research: ""
             }
           },
           headers: headers

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)["data"]
      expect(body["recorded_on"]).to eq("2026-05-10")
      expect(body["hypothesis"]).to eq("仮説本文")
      expect(body["result"]).to eq("結果")
      expect(body["sector_research"]).to eq("")
      expect(StockDailyNote.count).to eq(1)
    end

    it "updates an existing row" do
      StockDailyNote.create!(
        owner_key: "development",
        recorded_on: Date.new(2026, 5, 2),
        hypothesis: "old",
        result: "r",
        sector_research: "s"
      )

      post "/api/stock_daily_notes/upsert",
           params: {
             stock_daily_note: {
               recorded_on: "2026-05-02",
               hypothesis: "new",
               result: "r2",
               sector_research: "s2"
             }
           },
           headers: headers

      expect(response).to have_http_status(:ok)
      expect(StockDailyNote.count).to eq(1)
      row = StockDailyNote.first
      expect(row.hypothesis).to eq("new")
      expect(row.result).to eq("r2")
      expect(row.sector_research).to eq("s2")
    end

    it "returns 422 for invalid recorded_on" do
      post "/api/stock_daily_notes/upsert",
           params: {
             stock_daily_note: {
               recorded_on: "not-a-date",
               hypothesis: "a",
               result: "b",
               sector_research: "c"
             }
           },
           headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
