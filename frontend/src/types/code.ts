/**
 * Code Types
 * 代码管理模块类型定义
 */

/** 代码仓库 */
export interface Repository {
  id: string;
  name: string;
  language: string;
  branchCount: number;
  lastCommit: string;
}

/** 代码分支 */
export interface Branch {
  id: string;
  name: string;
  repositoryName: string;
  isDefault: boolean;
  lastCommit: string;
}
