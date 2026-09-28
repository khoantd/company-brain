import { describe, expect, it, vi } from 'vitest'
import { childrenFromFilePaths, listTree, type TreeNode } from '../server/brain'
import type { BrainStore } from '../server/store'

describe('childrenFromFilePaths', () => {
  it('builds nested dirs and files under a prefix', () => {
    const children = childrenFromFilePaths('01-COMPANY', [
      '01-COMPANY/COMPANY.md',
      '01-COMPANY/team/alice.md',
      '01-COMPANY/team/bob.md',
      '01-COMPANY/activity/2026-09.md',
    ])

    expect(children.map((n) => n.name)).toEqual(['activity', 'COMPANY.md', 'team'])
    const team = children.find((n) => n.name === 'team')
    expect(team?.type).toBe('dir')
    expect(team?.children?.map((n) => n.name)).toEqual(['alice.md', 'bob.md'])
    expect(team?.children?.[0]?.path).toBe('01-COMPANY/team/alice.md')
  })

  it('ignores paths outside the prefix and empty results', () => {
    expect(childrenFromFilePaths('01-COMPANY', [])).toEqual([])
    expect(
      childrenFromFilePaths('01-COMPANY', ['04-PRODUCTS/crm/PRODUCT.md', '01-COMPANY']),
    ).toEqual([])
  })

  it('caps depth at 8 path segments under the prefix', () => {
    const deep = `01-COMPANY/${Array.from({ length: 9 }, (_, i) => `d${i}`).join('/')}/file.md`
    expect(childrenFromFilePaths('01-COMPANY', [deep])).toEqual([])
    const ok = `01-COMPANY/${Array.from({ length: 7 }, (_, i) => `d${i}`).join('/')}/file.md`
    const children = childrenFromFilePaths('01-COMPANY', [ok])
    expect(children).toHaveLength(1)
    expect(children[0]?.type).toBe('dir')
  })
})

describe('listTree', () => {
  it('skips empty canonical roots and builds from listFiles', async () => {
    const store: BrainStore = {
      listChildren: vi.fn(),
      listFiles: vi.fn(async (prefix: string) => {
        if (prefix === '01-COMPANY') return ['01-COMPANY/COMPANY.md', '01-COMPANY/team/a.md']
        return []
      }),
      readText: vi.fn(),
      getSize: vi.fn(),
      writeText: vi.fn(),
    }

    const tree = await listTree(store)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.path).toBe('01-COMPANY')
    const names = (tree[0]?.children ?? []).map((n: TreeNode) => n.name)
    expect(names).toEqual(['COMPANY.md', 'team'])
    expect(store.listFiles).toHaveBeenCalled()
    expect(store.listChildren).not.toHaveBeenCalled()
  })
})
