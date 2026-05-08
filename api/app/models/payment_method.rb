class PaymentMethod < ApplicationRecord
  has_many :expenses, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :method_type, presence: true, inclusion: { in: %w[card bank_debit bank_withdrawal] }
  validates :closing_day, inclusion: { in: 1..31, allow_nil: true }
  validates :debit_day, inclusion: { in: 1..31, allow_nil: true }

  before_validation :normalize_schedule_for_method_type

  private

  def normalize_schedule_for_method_type
    self.closing_day = nil unless method_type == "card"
    self.debit_day = nil if method_type == "bank_withdrawal"
  end
end
