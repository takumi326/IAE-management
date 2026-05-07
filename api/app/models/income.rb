class Income < ApplicationRecord
  enum :income_type, { one_time: 0, recurring: 1 }, prefix: true

  belongs_to :minor_category

  has_many :income_transactions, dependent: :destroy
  has_many :transactions, through: :income_transactions
end
