/**
 * Interfaces Types
 * 接口模块类型定义
 */

/** 元接口 */
export interface MetaInterface {
  id: string;
  name: string;
  interfaceType: string;
  description: string;
  status: string;
}

/** 类接口 */
export interface ClassInterface {
  id: string;
  name: string;
  className: string;
  interfaceType: string;
  status: string;
}

/** 对象接口 */
export interface ObjectInterface {
  id: string;
  name: string;
  objectType: string;
  interfaceType: string;
  status: string;
}
