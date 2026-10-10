// @ts-check
/**
 * 从上游拉取 CEFR 分级西语词表，清洗后写成 scripts/cefr/<id>.tsv，
 * 再交给 build-dict.mjs 生成 public/dicts/*.json。
 *
 * 上游：https://github.com/realrentao/spanish-vocabulary-list
 *   data/levels/{A1..C2}.js  形如 window.VOCAB_LEVELS["A1"]=[{rank,word,pos,meaning,...}]
 * 上游仓库未声明 license，数据是作者本地解析的 markdown；分级是「词频带」而非
 * 官方 CEFR 审定，且含少量变位/复数形式。详见 README。
 *
 * 用法：node scripts/import-cefr.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(here, 'cefr')

const REPO = 'realrentao/spanish-vocabulary-list'
const REF = 'main'
const LEVELS = [
  { level: 'A1', id: 'es-a1' },
  { level: 'A2', id: 'es-a2' },
  { level: 'B1', id: 'es-b1' },
  { level: 'B2', id: 'es-b2' },
  { level: 'C1', id: 'es-c1' },
]

/**
 * 上游词性沿用意大利语缩写（agg./avv./cong./int.）与中文标记（专名/缩写），
 * 统一映射为西语缩写。专名缩写按最长优先匹配。
 */
const POS_TOKENS = {
  'agg.': 'adj.',
  'avv.': 'adv.',
  'cong.': 'conj.',
  'int.': 'interj.',
  's.': 'n.',
  'v.pass.': 'part.',
  'v.': 'v.',
  'adj.': 'adj.',
  'art.': 'art.',
  'prep.': 'prep.',
  'pron.': 'pron.',
  'num.': 'num.',
  'loc.': 'loc.',
  '专名缩写': 'n.pr.',
  '专有名词': 'n.pr.',
  '专名': 'n.pr.',
  '缩写': 'abrev.',
  '英文': 'ingl.',
  '英语词': 'ingl.',
}
const CJK_TAIL = /(专名缩写|专有名词|专名|缩写|英文|英语词)$/

function mapToken(token) {
  const t = token.trim()
  if (!t) return ''
  const m = t.match(CJK_TAIL)
  if (m) {
    const head = mapToken(t.slice(0, t.length - m[1].length))
    const tail = POS_TOKENS[m[1]]
    return [head, tail].filter(Boolean).join('/')
  }
  return POS_TOKENS[t] ?? t
}

function mapPos(pos) {
  if (!pos) return undefined
  // mapToken 可能返回 "n./n.pr." 这类复合结果，需再拆一次才能做折叠判断
  const parts = pos
    .split('/')
    .flatMap((t) => mapToken(t).split('/'))
    .filter(Boolean)
  // 专名本身即名词：出现 n.pr. 时丢掉冗余的 n.（如 s.专名 -> n.pr.）
  const collapsed = parts.includes('n.pr.')
    ? parts.filter((p) => p !== 'n.')
    : parts
  return [...new Set(collapsed)].join('/') || undefined
}

/** 上游是 `window.VOCAB_LEVELS["A1"]=[...];`，取等号后的 JSON 数组 */
function parseLevelJs(text) {
  const raw = text.trim()
  const eq = raw.indexOf('=')
  if (eq < 0) throw new Error('上游格式变化：未找到 "="')
  return JSON.parse(raw.slice(eq + 1).replace(/;\s*$/, ''))
}

/** 表头注释：记录出处，便于日后复核；build-dict.mjs 会跳过 # 行 */
function header(level) {
  return [
    `# CEFR ${level} 高频词`,
    `# source: ${REPO}@${REF} data/levels/${level}.js`,
    `# upstream license: 未声明（详见 README「词库来源与已知问题」）`,
    `# 列: name ⇥ trans(释义，；分隔) ⇥ phonetic ⇥ pos`,
  ].join('\n')
}

mkdirSync(OUT_DIR, { recursive: true })

for (const { level, id } of LEVELS) {
  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/data/levels/${level}.js`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`✗ ${level}: 下载失败 ${res.status} ${url}`)
    process.exit(1)
  }
  const entries = parseLevelJs(await res.text())

  const rows = []
  const seen = new Set()
  const skipped = []
  const posHistogram = {}

  for (const e of entries) {
    const name = String(e.word ?? '').normalize('NFC').trim()
    const trans = String(e.meaning ?? '').trim()
    if (!name || !trans) {
      skipped.push(`空字段: ${JSON.stringify(e.word)}`)
      continue
    }
    if (!/^[A-Za-zÀ-ÿ]+$/.test(name)) {
      skipped.push(`非纯字母: ${name}`)
      continue
    }
    if (seen.has(name)) {
      skipped.push(`重复: ${name}`)
      continue
    }
    seen.add(name)

    const pos = mapPos(e.pos)
    if (pos) posHistogram[pos] = (posHistogram[pos] ?? 0) + 1
    // 释义里的制表符会破坏列结构（当前上游没有，防御性替换）
    rows.push([name, trans.replace(/\t/g, ' '), '', pos ?? ''].join('\t'))
  }

  const out = [header(level), ...rows].join('\n') + '\n'
  writeFileSync(join(OUT_DIR, `${id}.tsv`), out)

  const top = Object.entries(posHistogram)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
  console.log(`✓ ${id}: ${rows.length} 词 (跳过 ${skipped.length}) -> scripts/cefr/${id}.tsv`)
  console.log(`  词性分布: ${top}`)
  if (skipped.length) console.log(`  跳过示例: ${skipped.slice(0, 5).join('；')}`)
}
