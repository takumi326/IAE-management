class ExpenseTransaction < ApplicationRecord
  belongs_to :expense
  belongs_to :transaction
end
