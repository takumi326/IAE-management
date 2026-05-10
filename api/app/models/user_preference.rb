class UserPreference < ApplicationRecord
  validates :owner_key, presence: true, uniqueness: true, length: { maximum: 255 }
  validates :import_claude_prompt_template, length: { maximum: 50_000 }, allow_nil: true
end
