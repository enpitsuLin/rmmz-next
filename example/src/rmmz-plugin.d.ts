
declare module 'virtual:rmmz-project' {
  /**
   * 异步加载项目根目录下指定路径的文件内容
   * @param filePath 相对于项目根目录的文件路径
   * @returns Promise<string> 文件内容
   * @throws Error 当文件不存在或读取失败时抛出错误
   */
  export function loadFile(filePath: string): Promise<string>

  /**
   * 获取指定文件路径对应的请求 URL
   * @param filePath 相对于项目根目录的文件路径
   * @returns string 可用于直接请求的 URL
   */
  export function getFileUrl(filePath: string): string

  /**
   * 项目根目录的绝对路径
   */
  export const projectRoot: string
}
