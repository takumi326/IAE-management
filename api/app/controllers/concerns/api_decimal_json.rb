# frozen_string_literal: true

# BigDecimal は to_s("F") で固定小数点文字列にできるが、Integer#to_s("F") は TypeError になる。
module ApiDecimalJson
  extend ActiveSupport::Concern

  private

  def decimal_json(value)
    return nil if value.nil?

    value.to_d.to_s("F")
  end
end
