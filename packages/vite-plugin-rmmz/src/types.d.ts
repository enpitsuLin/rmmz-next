export interface RMMZPluginOptions {
    /**
     * 项目根目录路径，默认为 public/project
     */
    projectRoot?: string;
    /**
     * API 路径
     * @default `/__rmmz__`
     */
    apiPath?: string;
    /**
     * 是否启用开发模式日志
     */
    debug?: boolean;
    /**
     * 生产环境输出目录名
     * @default `project`
     */
    outputDir?: string;
}
