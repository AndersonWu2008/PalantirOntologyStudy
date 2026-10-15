/**
 * Palantir-aligned Ontology type definitions.
 * Source of truth for JSON files: sibling *.schema.json files.
 */

export type ResourceId = string;
export type PropertyId = string;
export type ObjectTypeApiName = string;
export type PropertyApiName = string;
export type Rid = string;

export type Status =
  | "experimental"
  | "active"
  | "deprecated"
  | "example"
  | "promoted";

export type PropertyStatus = Exclude<Status, "promoted">;

export type Visibility = "prominent" | "normal" | "hidden";

export interface Deprecation {
  reason: string;
  deadline: string;
  replacedBy?: string;
}

export interface Icon {
  name: string;
  color: string;
}

export type PrimitiveBaseType =
  | "boolean"
  | "byte"
  | "short"
  | "integer"
  | "long"
  | "float"
  | "double"
  | "string"
  | "date"
  | "timestamp"
  | "geopoint"
  | "geoshape"
  | "vector"
  | "attachment"
  | "mediaReference"
  | "timeSeries"
  | "cipher"
  | "marking";

export type BaseType =
  | { type: PrimitiveBaseType }
  | { type: "array"; items: { type: PrimitiveBaseType }; allowEmpty?: boolean }
  | { type: "struct"; fields: StructField[] };

export interface StructField {
  apiName: PropertyApiName;
  displayName: string;
  baseType: PrimitiveBaseType;
  description?: string;
}

export interface RenderHints {
  searchable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  lowCardinality?: boolean;
  identifier?: boolean;
  longText?: boolean;
  keywords?: boolean;
  disableFormatting?: boolean;
  leadingWildcards?: boolean;
  regexQueries?: boolean;
}

export interface TypeClass {
  kind: string;
  name: string;
}

export interface ValueFormatting {
  kind: "numeric" | "dateTime" | "userId" | "resourceRid" | "artifactGid";
  numeric?: {
    style?: "currency" | "unit" | "percentage" | "prefixSuffix" | "fixedValues";
    currency?: string;
    unit?: string;
    prefix?: string;
    suffix?: string;
    useGrouping?: boolean;
    notation?: "standard" | "compact" | "scientific" | "engineering";
  };
  dateTime?: {
    pattern?:
      | "date"
      | "dateTimeLong"
      | "dateTimeShort"
      | "isoInstant"
      | "relativeToNow"
      | "time";
    timeZone?: string;
  };
}

export interface PropertyDefinition {
  id: PropertyId;
  rid: Rid;
  apiName: PropertyApiName;
  displayName: string;
  description?: string;
  status: PropertyStatus;
  visibility: Visibility;
  baseType: BaseType;
  required?: boolean;
  sharedProperty?: PropertyApiName;
  valueType?: string;
  renderHints?: RenderHints;
  typeClasses?: TypeClass[];
  valueFormatting?: ValueFormatting;
  deprecation?: Deprecation;
}

export interface ObjectTypeDefinition {
  id: ResourceId;
  rid: Rid;
  apiName: ObjectTypeApiName;
  displayName: string;
  pluralDisplayName: string;
  description?: string;
  aliases?: string[];
  groups?: string[];
  icon?: Icon;
  status: Status;
  visibility: Visibility;
  primaryKey: PropertyApiName;
  titleKey: PropertyApiName;
  implements?: string[];
  properties: Record<PropertyApiName, PropertyDefinition>;
  deprecation?: Deprecation;
}

export interface SharedPropertyDefinition {
  id: ResourceId;
  rid: Rid;
  apiName: PropertyApiName;
  displayName: string;
  description?: string;
  status: PropertyStatus;
  visibility: Visibility;
  baseType: BaseType;
  valueType?: string;
  renderHints?: RenderHints;
  typeClasses?: TypeClass[];
  valueFormatting?: ValueFormatting;
}

export type ValueTypeConstraint =
  | { type: "enum"; values: Array<string | number | boolean>; caseSensitive?: boolean }
  | { type: "range"; min?: number | string; max?: number | string }
  | { type: "regex"; pattern: string; substring?: boolean }
  | { type: "rid" }
  | { type: "uuid" };

export interface ValueTypeDefinition {
  id: ResourceId;
  rid: Rid;
  apiName: ObjectTypeApiName;
  displayName: string;
  description?: string;
  baseType: BaseType;
  constraints?: ValueTypeConstraint[];
}
