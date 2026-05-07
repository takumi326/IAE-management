expense_majors = ["食費", "ソシャゲ", "雑費", "サブスク", "ゲーム"]
income_majors = ["給与", "副収入"]

expense_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :expense, name: name)
end
income_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :income, name: name)
end

{
  "食費" => ["外食", "出前館", "UberEats"],
  "ソシャゲ" => ["崩壊スターレイル", "鳴潮", "ゼンレスゾーンゼロ", "アークナイツ", "エンドフィールド"],
  "雑費" => ["Amazon", "UCC（コーヒー）", "宝くじ", "Amazon Prime", "PC保証", "Google Playカード"],
  "サブスク" => ["LINE", "Note（グリーンさん）", "Google Storage", "Claude", "エニタイム", "YouTube"],
  "ゲーム" => ["Steam"]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :expense, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end

{
  "給与" => ["基本給", "賞与"]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :income, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end
