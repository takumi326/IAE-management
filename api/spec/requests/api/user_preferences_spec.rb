require "rails_helper"

RSpec.describe "Api::UserPreferences", type: :request do
  let(:headers) { { "HOST" => "www.example.com" } }

  describe "GET /api/user_preferences" do
    it "returns nil template when no row exists" do
      get "/api/user_preferences", headers: headers

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["data"]["import_claude_prompt_template"]).to be_nil
    end
  end

  describe "PATCH /api/user_preferences" do
    it "persists and returns the template" do
      template = "x {{CATALOG}} {{PAYMENT_METHOD_NAME}} {{EXAMPLE_MINOR_ID}}"

      patch "/api/user_preferences",
            params: { user_preference: { import_claude_prompt_template: template } },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig("data", "import_claude_prompt_template")).to eq(template)

      get "/api/user_preferences", headers: headers
      expect(JSON.parse(response.body).dig("data", "import_claude_prompt_template")).to eq(template)
    end

    it "clears template with JSON null" do
      UserPreference.create!(owner_key: "development", import_claude_prompt_template: "keep")

      patch "/api/user_preferences",
            params: { user_preference: { import_claude_prompt_template: nil } },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(UserPreference.find_by(owner_key: "development").import_claude_prompt_template).to be_nil
    end
  end
end
