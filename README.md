# Palabras — 西班牙语单词记忆 / 打字练习

参考 [qwerty-learner](https://github.com/RealKai42/qwerty-learner) 的思路重做的**西班牙语**单词工具：
逐字母输入单词，**打错必须退格清空后整词重打**，把「单词记忆」和「键盘肌肉记忆」结合起来。
纯浏览器运行、离线可用、进度存在本地。

## 功能

- **选词库 → 分章节练习**：内置 6 个词库 —— 《西班牙语核心词》256 词（西→中 + IPA + 词性）+ **CEFR A1 / A2 / B1 / B2 / C1 各 1000 词**（西→中 + 词性），每章 20 词
- **打错整词重打**：错误字符变红并锁定输入，退格清空后才可重输；打过的错词章节末尾重新出现
- **三种拼写严格度**：宽松（重音可省，默认）/ 严格（须打重音）/ 忽略 ñ
- **默写模式**：隐藏元音 / 隐藏辅音 / 全部隐藏 / 随机隐藏
- **发音**：浏览器内置 TTS（Web Speech API，`es-ES`），可调语速与音色
- **重音辅助**：点击插入 `á é í ó ú ü ñ ¿ ¡`；同一词连错 2 次显示死键 / Alt 码提示
- **自定义词库导入**：JSON 或 CSV，逐行校验并显示问题，自定义词库置顶可删除
- **本地进度**：完成的章节持久化到 localStorage；章节内「打到第几个词」也会记忆，刷新后接着打
- **进度备份**：一键导出/导入进度（含自定义词库与设置）为 JSON，清缓存或换设备后可恢复；导入按并集合并，不覆盖已有记录

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产出 dist/（base 为 './'，可部署到任意子路径）
npm run preview
npm test           # vitest 单测
```

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS v4 + jotai + clsx + vitest。

刻意不引入：Dexie / IndexedDB（MVP 数据 < 300 KB 且是 key-value 形状）、react-router（仅 3 页，用 `pageAtom` 切换）、zod（导入校验手写）、任何统计图表 / 音效 / 云端同步。

## 目录结构

```
src/
├── core/       纯函数区（★ 禁止 import react，可脱离 React 单测）
│   ├── text.ts           Unicode 归一化与西语重音匹配
│   ├── chapter.ts        章节切分与洗牌
│   ├── dictation.ts      默写遮罩生成
│   ├── typingMachine.ts  打字状态机 reducer
│   └── importer.ts       JSON/CSV 解析 + 校验
├── store/      jotai atoms（唯一落盘区）
├── data/       词库注册表（index.json + 自定义词库合并）
├── hooks/      useDictionary / useSpeech / useTypingSession
├── components/ UI 组件
└── pages/      Gallery / Typing / Result
```

## 架构不变量

1. `src/core/**` **不得 import react** —— 保持纯函数可测试边界。
2. 只有 `src/store/**` 的 atom 会落盘，其余为内存态。
3. 所有词条文本进入系统时统一做 **NFC 归一化**（数据脚本、导入、比较前各一次）。

## 西语输入匹配（最容易踩的坑）

西语需要处理重音 `á é í ó ú`、分音 `ü`、波浪 `ñ`、倒标点 `¿ ¡`。

关键陷阱：**NFD 分解下 `ñ` = `n` + U+0303，与 `á` = `a` + U+0301 结构同构**。
一刀切删掉所有组合字符会把 `ñ` 变成 `n`，而 `año`(年) / `ano`(肛门)、`niño` / `nino` 是真实词义对立。

因此默认的 `lenient` 模式**只剥离 U+0301/U+0308**（重音、分音），**保留 U+0303**（波浪）：

| 模式 | 行为 | 例 |
|---|---|---|
| `strict` | 完全一致 | `cámara` 必须打 `á` |
| `lenient`（默认） | 重音可省，`ñ` 不放宽 | `camara` ✓，`nino` ✗（`niño`） |
| `ignore-tilde` | 连 `ñ` 一起放宽 | `nino` ✓ |

所有模式均大小写不敏感。

## 数据持久化

`store/storage.ts` 是**唯一存储出口**（localStorage，键前缀 `palabras:`，带 schema 版本与 try/catch）。
逐键写盘会拖慢打字，所以**不持久化** `typed` / `errored` 这类半成品输入 —— 刷新后当前词从头打，不留「半个单词」。

**章节续打**（`typingResume`）：每推进一个词，就把「打到第几个词」写盘一次（存的是队列在章节词表里的
下标序列 + 当前下标，因此洗牌顺序与「打错重排到队尾」的词也能原样恢复）。刷新或中途返回再进来会从
上次那个词接着打；整章完成或重开本章则清除该记录（下次从头开始）。该 atom 用 `getOnInit: true`，
否则首帧读到空对象会把续打位置误判为「无记录」而清掉。

**进度备份**（Gallery 页「进度备份」区）：`core/backup.ts` 把 `progress` / `customDicts` / `settings`
序列化为 `{ kind: 'palabras-backup', version, exportedAt, ... }` 的 JSON 文件下载（文件名
`palabras-backup-YYYYMMDD-HHmm.json`）。导入时校验 `kind` / `version` 并逐字段清洗，再按并集合并：
进度取章节并集、自定义词库按 id 合并（新导入覆盖同名）、设置整体替换。这样清缓存或换设备后不会丢进度。

## 词库格式

内置词库分两级文件：`public/dicts/index.json`（元信息，Gallery 只加载它）+
`public/dicts/<id>.json`（正文，进练习页才懒加载）。当前共 6 个词库：

| id | 名称 | 词数 | 来源 |
|---|---|---|---|
| `es-core` | 西班牙语核心词 | 256 | 本项目自行编写（西→中 + IPA + 词性） |
| `es-a1` … `es-c1` | 西班牙语 A1 / A2 / B1 / B2 / C1 | 各 1000 | 见「词库来源与已知问题」 |

词库正文：

```json
{
  "words": [
    { "name": "cámara", "trans": ["相机"], "phonetic": "ˈkamaɾa", "pos": "n.f." }
  ]
}
```

自定义词库导入支持：

- **JSON**：裸数组或 `{ "words": [...] }`
- **CSV**：带表头（`name,trans,phonetic,pos,example`，支持中文表头与 `usphone`/`notation` 等别名）
  或无表头按位置解析；支持 `"` 包裹字段与 `""` 转义
- `trans` 可为数组，或用 `；;|、/` 分隔的字符串
- 已验证的旧格式字段（`word`/`usphone`/`ukphone`/`notation`）会被自动映射，可直接吃 qwerty-learner 的 JSON 词表

上限：单词 ≤ 64 字符、不含中文；文件 ≤ 2 MB；词条 ≤ 5000。重复词按 `foldAccents` 静默去重。

### 扩充 / 重建内置词库

词库清单在 `scripts/build-dict.mjs` 顶部的 `DICTS` 数组（`id / name / description / category / tags / src`），
每个条目对应一个 TSV 源文件。TSV 为 Tab 分隔：`单词⇥释义⇥音标⇥词性`（释义用 `；` 分隔，`#` 开头为注释行）。编辑或新增后：

```bash
node scripts/build-dict.mjs
```

脚本会做 NFC 归一、剥 BOM、去重、校验，自动计算 `wordCount`，写出各 `public/dicts/<id>.json` 与合并的
`public/dicts/index.json`。**不要手写 JSON**（macOS 容易产出 NFD 分解形式，是西语最隐蔽的一类 bug）。
去重按 **NFC 精确匹配**：`si`/`sí`、`el`/`él` 这类靠重音区分的词是不同词，必须都保留。

### 重建 CEFR 词库（A1–C1）

`scripts/import-cefr.mjs` 从上游拉取词表，转成 `scripts/cefr/es-{a1,a2,b1,b2,c1}.tsv`：

```bash
node scripts/import-cefr.mjs   # 生成 TSV
node scripts/build-dict.mjs    # TSV -> public/dicts/*.json
```

脚本会把上游的意大利语词性缩写（`agg.` / `avv.` / `s.` …）与中文标记（`专名` / `缩写` …）
映射为西语缩写（`adj. adv. n. n.pr. abrev.` …），并给每个 TSV 写入 4 行来源注释头。

## 词库来源与已知问题

**`es-core`（核心词）**：中文释义与 IPA 为本项目自行编写，词频参考公开西语词频表。

**`es-a1` … `es-c1`（CEFR）**：数据取自上游
[`realrentao/spanish-vocabulary-list`](https://github.com/realrentao/spanish-vocabulary-list)
（`data/levels/{A1..C2}.js`，每级 1000 词，含中文释义与词性）。诚实地记录以下已知问题：

- **上游未声明任何 license**。若本项目用于公开分发，请先与上游确认授权，或替换为许可明确的数据集；
  由于整条管线都是脚本可复现的（`import-cefr.mjs` + `build-dict.mjs`），换源成本很低。
- **分级是「词频带划分」而非官方 CEFR 审定**：上游把词频排名 1–1000 划为 A1、1001–2000 划为 A2，以此类推，
  不代表逐个词经过 CEFR 人工评级。
- **含少量变位 / 复数形式**：部分词条是屈折形式（如 `escucho`、`almas`、`suficientes`、`veamos`、`dimos`），
  并非词典原形。
- **个别词条缺少应有重音**：如 `unico`（应为 `único`）、`queria`（应为 `quería`）。
- **无 IPA 音标**：上游不提供音标，故 A1–C1 词条只有 `pos` 没有 `phonetic`；发音仍由 TTS 提供。
- **词性缩写已做映射**：上游沿用意大利语缩写（`agg.` / `avv.` / `s.` …）与中文标记（`专名` / `缩写`），
  已在 `import-cefr.mjs` 中统一转为西语缩写 `abrev. adj. adv. art. conj. ingl. interj. loc. n. n.pr. num. part. prep. pron. v.`。

## 测试

```bash
npm test
```

`src/core/*.test.ts` 覆盖三档重音匹配（重点验证 `n`/`ñ` 在 `lenient` 下判否、`a`/`á` 判是）、
打字状态机不变量（打错锁定、清空复位、错词重新入队且队列有上限保证终止、粘贴逐字校验）、
以及导入解析（CSV 引号/表头/BOM、JSON 结构、去重与校验）。

## 已实现范围之外

错题本、学习统计图表、分享图、按键音效、云端同步 —— 均未实现，留待后续。
