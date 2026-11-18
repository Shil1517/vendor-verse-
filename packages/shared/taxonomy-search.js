const SUBCATEGORY_ALIASES = [
  { industryId: 'i_home', subcategory: 'Electrician', terms: ['electricity', 'electric', 'electrical repair', 'electrical service', 'wiring'] },
  { industryId: 'i_constr', subcategory: 'Electrical projects', terms: ['electricity', 'electrical contractor', 'electrical work', 'electrical installation'] },
  { industryId: 'i_whole', subcategory: 'Electrical supplies', terms: ['electricity', 'electrical material', 'electrical equipment', 'electrical products'] },
]

const INDUSTRY_ALIASES = {
  i_energy: ['electricity', 'electric utility', 'power supply', 'electrical services'],
}

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

const editDistance = (left, right, limit) => {
  if (Math.abs(left.length - right.length) > limit) return limit + 1
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]
    let rowMinimum = row
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      )
      rowMinimum = Math.min(rowMinimum, current[column])
    }
    if (rowMinimum > limit) return limit + 1
    previous = current
  }
  return previous[right.length]
}

const matchQuality = (query, value) => {
  const text = normalize(value)
  if (!text) return 0
  if (text === query) return 3
  if (text.includes(query)) return 2

  const queryTokens = query.split(' ')
  const textTokens = text.split(' ')
  const matches = queryTokens.every((queryToken) => textTokens.some((textToken) => {
    if (textToken.startsWith(queryToken)) return true
    if (queryToken.length < 5) return false
    return editDistance(queryToken, textToken, queryToken.length > 7 ? 2 : 1) <= (queryToken.length > 7 ? 2 : 1)
  }))
  return matches ? 1 : 0
}

export function searchIndustries(industries, searchText) {
  const query = normalize(searchText)
  if (!query) return industries.map((industry) => ({ industry, matchedSubcategories: [] }))

  return industries
    .map((industry, index) => {
      const subcategoryMatches = (industry.subs || []).map((subcategory) => {
        const directQuality = matchQuality(query, subcategory)
        const aliases = SUBCATEGORY_ALIASES.find((entry) => entry.industryId === industry.id && entry.subcategory === subcategory)?.terms || []
        const aliasQuality = Math.max(0, ...aliases.map((term) => matchQuality(query, term)))
        return { subcategory, directQuality, aliasQuality }
      })
      const directSubcategoryQuality = Math.max(0, ...subcategoryMatches.map((match) => match.directQuality))
      const aliasSubcategoryQuality = Math.max(0, ...subcategoryMatches.map((match) => match.aliasQuality))
      const industryNameQuality = matchQuality(query, industry.name)
      const industryAliasQuality = Math.max(0, ...(INDUSTRY_ALIASES[industry.id] || []).map((term) => matchQuality(query, term)))
      const score = Math.max(
        directSubcategoryQuality === 3 ? 900 : directSubcategoryQuality === 2 ? 800 : directSubcategoryQuality ? 450 : 0,
        industryNameQuality === 3 ? 850 : industryNameQuality === 2 ? 750 : industryNameQuality ? 350 : 0,
        aliasSubcategoryQuality === 3 ? 700 : aliasSubcategoryQuality === 2 ? 650 : aliasSubcategoryQuality ? 500 : 0,
        industryAliasQuality === 3 ? 600 : industryAliasQuality === 2 ? 550 : industryAliasQuality ? 400 : 0,
      )

      return {
        industry,
        index,
        score,
        matchedSubcategories: subcategoryMatches
          .filter((match) => match.directQuality || match.aliasQuality)
          .map((match) => match.subcategory),
      }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ industry, matchedSubcategories }) => ({ industry, matchedSubcategories }))
}
