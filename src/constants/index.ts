export const CHAPTER_LENGTH = 20

export const EXPLICIT_SPACE = '␣'

export const STORAGE_PREFIX = 'palabras:'

export const SCHEMA_VERSION = 1

export const SPEECH_LANG = 'es-ES'

/** 默认设置（见 types/Settings） */
export const DEFAULT_SETTINGS = {
  accentMode: 'lenient',
  dictationMode: 'none',
  fontSize: 48,
  shuffle: false,
  autoSpeak: true,
  speechRate: 0.9,
  voiceURI: null,
} as const

/** 默写模式下被遮罩字符的占位符 */
export const MASK_CHAR = '·'

/** [字符, macOS 死键, Windows Alt 码] */
export const ACCENT_HINTS: [string, string, string][] = [
  ['á', 'Option+e a', 'Alt+0225'],
  ['é', 'Option+e e', 'Alt+0233'],
  ['í', 'Option+e i', 'Alt+0237'],
  ['ó', 'Option+e o', 'Alt+0243'],
  ['ú', 'Option+e u', 'Alt+0250'],
  ['ü', 'Option+u u', 'Alt+0252'],
  ['ñ', 'Option+n n', 'Alt+0241'],
  ['¿', 'Option+Shift+/', 'Alt+0191'],
  ['¡', 'Option+1', 'Alt+0161'],
]

export const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024
export const IMPORT_MAX_WORDS = 5000

/** 进度备份文件上限（含自定义词库，放宽到 20MB） */
export const BACKUP_MAX_FILE_BYTES = 20 * 1024 * 1024
