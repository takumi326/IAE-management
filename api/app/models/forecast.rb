class Forecast < ApplicationRecord
  enum :kind, { expense: 0, income: 1 }, prefix: true
end
