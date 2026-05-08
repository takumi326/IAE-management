expense_majors = [ "食費", "ソシャゲ", "雑費", "サブスク", "ゲーム" ]
income_majors = [ "給与", "副収入" ]

expense_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :expense, name: name)
end
income_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :income, name: name)
end

{
  "食費" => [ "外食", "出前館", "ウーバーイーツ" ],
  "ソシャゲ" => [ "崩壊スターレイル", "鳴潮", "ゼンレスゾーンゼロ", "アークナイツ", "エンドフィールド" ],
  "雑費" => [ "アマゾン", "UCC（コーヒー）", "宝くじ", "アマゾンプライム", "PC保証", "グーグルプレイカード" ],
  "サブスク" => [ "Line", "Note（グリーンさん）", "Google Storage", "Claude", "エニタイム", "YouTube Premium" ],
  "ゲーム" => [ "Steam", "PlayStation", "任天堂" ]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :expense, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end

{
  "給与" => [ "基本給", "賞与" ]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :income, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end

[
  { name: "楽天カード", method_type: "card", closing_day: nil, debit_day: 27 },
  { name: "みずほ口座引落", method_type: "bank_debit", closing_day: nil, debit_day: 26 },
  { name: "ATM引き出し", method_type: "bank_withdrawal", closing_day: nil, debit_day: nil }
].each do |attrs|
  PaymentMethod.find_or_create_by!(name: attrs[:name]) do |pm|
    pm.method_type = attrs[:method_type]
    pm.closing_day = attrs[:closing_day]
    pm.debit_day = attrs[:debit_day]
  end
end

today = Date.current
fiscal_year_start_year = today.month >= 4 ? today.year : today.year - 1
fiscal_start = Date.new(fiscal_year_start_year, 4, 1)

# 今年度(4月〜翌3月)の月次予測。再seedしても(kind, month)で上書きされる。
12.times do |i|
  month = fiscal_start.advance(months: i)

  [
    { kind: :expense, amount: 200_000 },
    { kind: :income, amount: 335_000 }
  ].each do |attrs|
    forecast = Forecast.find_or_initialize_by(kind: attrs[:kind], month: month)
    forecast.amount = attrs[:amount]
    forecast.save!
  end
end
