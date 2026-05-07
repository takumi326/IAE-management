class IncomeTransaction < ApplicationRecord
  belongs_to :income
  belongs_to :transaction
end
