import YahooFinance from 'yahoo-finance2'

export interface ResolveOptions {
  preferredExchanges?: string[] // e.g., ["LSE","NASDAQ","NYSE","XETRA"]
  currency?: string // Prefer matches with this currency, e.g., "GBP"
  limit?: number // max candidates to return
}

interface Candidate {
  symbol: string
  shortName?: string
  longName?: string
  exchange?: string
  currency?: string
  quoteType?: string
  score: number
}

const STOPWORDS = new Set([
  'the','a','an','for','and','or','of','in','on','at','to','from','with','by','co','company','inc','plc','ltd','sa','ag'
])

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t))
}

function scoreCandidate(qTokens: string[], c: Candidate, opts: ResolveOptions): number {
  let score = 0
  const name = (c.shortName || c.longName || c.symbol || '').toLowerCase()

  // Token overlap
  const nameTokens = tokenize(name)
  let overlap = 0
  for (const t of qTokens) if (nameTokens.includes(t)) overlap++
  score += overlap * 10

  // Exact name contains query phrase
  if (name.includes(qTokens.join(' '))) score += 20

  // Prefer equities
  if (c.quoteType === 'EQUITY') score += 15
  else if (c.quoteType === 'ETF') score -= 5
  else if (c.quoteType) score -= 10

  // Currency preference
  if (opts.currency && c.currency && opts.currency.toUpperCase() === c.currency.toUpperCase()) score += 10

  // Exchange preference with ordering
  if (opts.preferredExchanges && c.exchange) {
    const i = opts.preferredExchanges.findIndex(ex => ex.toLowerCase() === c.exchange!.toLowerCase())
    if (i >= 0) score += Math.max(0, 30 - i * 5)
  }

  return score
}

export async function resolveTicker(yf: InstanceType<typeof YahooFinance>, query: string, opts: ResolveOptions = {}) {
  const qTokens = tokenize(query)
  if (!qTokens.length) throw new Error('Empty query after sanitisation')

  const raw = await yf.search(query)
  const quotes = (raw as any)?.quotes ?? []

  const candidates: Candidate[] = quotes.map((q: any) => ({
    symbol: q.symbol,
    shortName: q.shortname ?? q.shortName,
    longName: q.longname ?? q.longName,
    exchange: q.exchDisp ?? q.exchange ?? q.fullExchangeName,
    currency: q.currency,
    quoteType: q.quoteType,
    score: 0
  }))

  for (const c of candidates) c.score = scoreCandidate(qTokens, c, opts)
  candidates.sort((a, b) => b.score - a.score)

  const limit = Math.max(1, Math.min(10, opts.limit ?? 5))
  const top = candidates.slice(0, limit)

  return {
    query,
    best: top[0] ?? null,
    candidates: top
  }
}
