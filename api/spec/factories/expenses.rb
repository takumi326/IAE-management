FactoryBot.define do
  factory :expense do
    association :minor_category
    association :payment_method
    expense_type { :one_time }
    start_month { Date.new(2026, 5, 1) }
    end_month { nil }
  end
end
