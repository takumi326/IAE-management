import type { MajorCategory, MinorCategory } from "./api.ts"

/** 大カテゴリ: 種別（expense / income）→ 名前順 */
export function sortMajorCategories(majors: MajorCategory[]): MajorCategory[] {
  return [...majors].sort((a, b) => {
    const k = a.kind.localeCompare(b.kind)
    if (k !== 0) return k
    return a.name.localeCompare(b.name, "ja")
  })
}

/** 小カテゴリ: 大カテゴリ名 → 小カテゴリ名 */
export function sortMinorCategories(minors: MinorCategory[]): MinorCategory[] {
  return [...minors].sort((a, b) => {
    const ma = a.major_category.name.localeCompare(b.major_category.name, "ja")
    if (ma !== 0) return ma
    return a.name.localeCompare(b.name, "ja")
  })
}
