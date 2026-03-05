export declare function getMimeType(filePath: string): string;
export declare function isBinaryFile(filePath: string): boolean;
export declare function shouldTransform(filePath: string): boolean;
export declare function copyDirectory(src: string, dest: string): Promise<void>;
