declare module 'virtual:rmmz-project' {
  /**
   * 获取指定文件路径对应的请求 URL
   * @param filePath 相对于项目根目录的文件路径
   * @returns string 可用于直接请求的 URL
   */
  export function fileurl(filePath: string): string

  /**
   * 项目根目录的绝对路径
   */
  export const projectRoot: string
}
