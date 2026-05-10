module Api
  class UserPreferencesController < ApplicationController
    def show
      row = UserPreference.find_or_initialize_by(owner_key: preference_owner_key)
      render json: { data: serialize(row) }
    end

    def update
      row = UserPreference.find_or_initialize_by(owner_key: preference_owner_key)
      attrs = user_preference_params
      raw = attrs[:import_claude_prompt_template]
      row.import_claude_prompt_template = raw.nil? ? nil : raw.to_s.presence

      if row.save
        render json: { data: serialize(row) }
      else
        render json: {
          error: { code: "validation_error", message: "Invalid user preference", details: row.errors }
        }, status: :unprocessable_entity
      end
    end

    private

    def user_preference_params
      params.require(:user_preference).permit(:import_claude_prompt_template)
    end

    def serialize(row)
      {
        import_claude_prompt_template: row.import_claude_prompt_template
      }
    end
  end
end
