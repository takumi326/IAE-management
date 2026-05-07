class Expense < ApplicationRecord
  enum :expense_type, { one_time: 0, recurring: 1 }, prefix: true

  belongs_to :minor_category
  belongs_to :payment_method

  has_many :expense_transactions, dependent: :destroy
  has_many :transactions, through: :expense_transactions
end
