class Expense < ApplicationRecord
  enum :expense_type, { one_time: 0, recurring: 1 }, prefix: true

  belongs_to :minor_category
  belongs_to :payment_method

  has_many :expense_transactions, dependent: :destroy
  has_many :transactions, through: :expense_transactions, source: :ledger_transaction

  validates :expense_type, :start_month, presence: true
  validate :end_month_not_before_start_month

  private

  def end_month_not_before_start_month
    return if end_month.blank? || start_month.blank?
    return unless end_month < start_month

    errors.add(:end_month, "must be greater than or equal to start_month")
  end
end
