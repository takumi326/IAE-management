class PaymentMethod < ApplicationRecord
  has_many :expenses, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :method_type, presence: true
end
