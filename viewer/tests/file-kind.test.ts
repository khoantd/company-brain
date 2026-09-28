import { describe, expect, it } from 'vitest'
import { isHtmlPath } from '../src/lib/file-kind'

describe('isHtmlPath', () => {
  it('matches .html and .htm case-insensitively', () => {
    expect(isHtmlPath('01-COMPANY/page.html')).toBe(true)
    expect(isHtmlPath('page.HTML')).toBe(true)
    expect(isHtmlPath('docs/index.htm')).toBe(true)
    expect(isHtmlPath('docs/Index.HTM')).toBe(true)
  })

  it('rejects non-html paths', () => {
    expect(isHtmlPath('01-COMPANY/notes.md')).toBe(false)
    expect(isHtmlPath('data.json')).toBe(false)
    expect(isHtmlPath('style.css')).toBe(false)
    expect(isHtmlPath('page.html.bak')).toBe(false)
    expect(isHtmlPath('')).toBe(false)
  })
})
