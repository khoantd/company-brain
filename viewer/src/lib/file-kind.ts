/** True when the path is an HTML document (previewable in the viewer). */
export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path)
}
