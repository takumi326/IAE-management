expense_majors = %w[food social_game misc subscription game]
income_majors = %w[salary side_income]

expense_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :expense, name: name)
end
income_majors.each do |name|
  MajorCategory.find_or_create_by!(kind: :income, name: name)
end

{
  food: %w[dining_out demaecan uber_eats],
  social_game: %w[star_rail meicho zzz arknights endfield],
  misc: %w[amazon ucc_coffee lottery amazon_prime pc_warranty google_play_card],
  subscription: %w[line note_green google_storage claude anytime youtube],
  game: %w[steam]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :expense, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end

{
  salary: %w[base_salary bonus]
}.each do |major_name, minors|
  major = MajorCategory.find_by!(kind: :income, name: major_name)
  minors.each do |minor_name|
    MinorCategory.find_or_create_by!(major_category: major, name: minor_name)
  end
end
