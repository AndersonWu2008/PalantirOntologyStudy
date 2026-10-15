/**
 * Entity Pipeline Store
 * 5步实体创建向导状态管理 - 基于 Entity Creation 流程
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export interface ColumnInfo {
  name: string;
  data_type: string;
  sample_values: any[];
}

export interface DatasourceConfig {
  source_type: 'existing' | 'new' | 'none';
  existing_datasource?: {
    id: string;
    name: string;
    schema: ColumnInfo[];
  };
  new_datasource?: {
    type: 'file' | 'database';
    file?: File;
    connection?: DatabaseConnection;
  };
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface EntityMetadata {
  icon?: string;
  api_name: string;
  display_name: string;
  plural_name?: string;
  description?: string;
  group?: string[];
}

export type DataType = 
  | 'string' | 'integer' | 'long' | 'double' 
  | 'boolean' | 'date' | 'datetime' | 'text' 
  | 'json' | 'attachment' | 'enum' | 'reference';

export interface PropertyConfig {
  id?: string;
  api_name: string;
  display_name: string;
  description?: string;
  source_column?: string;
  data_type: DataType;
  property_type: 'primitive' | 'reference' | 'computed';
  
  // 约束
  is_required: boolean;
  is_unique: boolean;
  is_searchable: boolean;
  is_sortable: boolean;
  
  // 显示
  unit?: string;
  default_value?: any;
  validation_rules?: ValidationRule[];
  
  // 特殊标记
  is_primary_key: boolean;
  is_title_field: boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface RelationshipConfig {
  id?: string;
  api_name: string;
  display_name: string;
  target_entity_id: string;
  target_entity_name: string;
  relation_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  description?: string;
}

export interface ActionConfig {
  type: 'create' | 'update' | 'delete' | 'import';
  enabled: boolean;
  api_name: string;
  display_name: string;
  
  // 表单配置
  form_fields: string[];
  required_fields: string[];
  
  // 权限
  permissions: {
    type: 'organization' | 'groups' | 'users';
    groups?: string[];
    users?: string[];
  };
  
  // 验证规则
  validation_rules?: ValidationRule[];
}

export interface SaveLocation {
  project_id: string;
  project_path: string[];
  inherit_permissions: boolean;
  custom_permissions?: {
    view: string[];
    edit: string[];
    delete: string[];
    manage: string[];
  };
}

export interface WizardData {
  datasource: DatasourceConfig;
  metadata: EntityMetadata;
  properties: PropertyConfig[];
  primary_key?: string;
  title_field?: string;
  relationships: RelationshipConfig[];
  actions: ActionConfig[];
  save_location: SaveLocation;
}

export interface WizardErrors {
  [step: number]: string[];
}

// ============================================================
// Store Interface
// ============================================================

interface EntityPipelineState {
  currentStep: number;
  completedSteps: number[];
  data: WizardData;
  errors: WizardErrors;
  isSubmitting: boolean;
  isLoading: boolean;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  markStepCompleted: (step: number) => void;

  // Step 1: Datasource
  setDatasource: (datasource: DatasourceConfig) => void;
  
  // Step 2: Metadata
  setMetadata: (metadata: EntityMetadata) => void;
  updateMetadataField: (field: keyof EntityMetadata, value: any) => void;
  
  // Step 3: Properties
  addProperty: (property: PropertyConfig) => void;
  updateProperty: (index: number, property: PropertyConfig) => void;
  removeProperty: (index: number) => void;
  setProperties: (properties: PropertyConfig[]) => void;
  setPrimaryKey: (api_name: string) => void;
  setTitleField: (api_name: string) => void;
  autoMapProperties: (columns: ColumnInfo[]) => void;
  
  // Step 4: Relationships
  addRelationship: (relationship: RelationshipConfig) => void;
  updateRelationship: (index: number, relationship: RelationshipConfig) => void;
  removeRelationship: (index: number) => void;
  setRelationships: (relationships: RelationshipConfig[]) => void;
  
  // Step 5: Actions
  addAction: (action: ActionConfig) => void;
  updateAction: (index: number, action: ActionConfig) => void;
  removeAction: (index: number) => void;
  setActions: (actions: ActionConfig[]) => void;
  toggleAction: (index: number) => void;
  generateDefaultActions: () => void;
  
  // Step 6: Save Location
  setSaveLocation: (location: SaveLocation) => void;

  // Validation
  setStepError: (step: number, errors: string[]) => void;
  clearStepError: (step: number) => void;
  validateCurrentStep: () => boolean;
  validateStep: (step: number) => boolean;

  // Submission
  setSubmitting: (isSubmitting: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  submitWizard: () => Promise<boolean>;
  resetWizard: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialData: WizardData = {
  datasource: {
    source_type: 'none',
  },
  metadata: {
    api_name: '',
    display_name: '',
    plural_name: '',
    description: '',
    icon: 'DatabaseOutlined',
    group: [],
  },
  properties: [],
  relationships: [],
  actions: [],
  save_location: {
    project_id: '',
    project_path: [],
    inherit_permissions: true,
  },
};

// ============================================================
// Helper Functions
// ============================================================

const generateApiName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const inferDataType = (columnName: string, sampleValues: any[]): DataType => {
  const name = columnName.toLowerCase();
  
  // Check column name patterns
  if (name.includes('id') || name.includes('uuid')) return 'string';
  if (name.includes('date') || name.includes('time')) {
    return name.includes('time') && !name.includes('date') ? 'datetime' : 'date';
  }
  if (name.includes('count') || name.includes('num') || name.includes('qty')) return 'integer';
  if (name.includes('price') || name.includes('amount') || name.includes('rate')) return 'double';
  if (name.includes('is_') || name.includes('has_') || name.includes('enabled') || name.includes('active')) {
    return 'boolean';
  }
  if (name.includes('desc') || name.includes('content') || name.includes('detail')) return 'text';
  if (name.includes('json') || name.includes('config') || name.includes('meta')) return 'json';
  if (name.includes('file') || name.includes('attachment') || name.includes('doc')) return 'attachment';
  
  // Check sample values
  if (sampleValues.length > 0) {
    const firstValue = sampleValues[0];
    if (typeof firstValue === 'boolean') return 'boolean';
    if (typeof firstValue === 'number') {
      return Number.isInteger(firstValue) ? 'integer' : 'double';
    }
    if (firstValue instanceof Date) return 'datetime';
  }
  
  return 'string';
};

const generatePluralName = (singular: string): string => {
  if (!singular) return '';
  // Simple Chinese pluralization
  return singular + '们';
};

// ============================================================
// Store
// ============================================================

export const useEntityPipelineStore = create<EntityPipelineState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      completedSteps: [],
      data: initialData,
      errors: {},
      isSubmitting: false,
      isLoading: false,

      // Navigation
      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, completedSteps } = get();
        const newStep = Math.min(currentStep + 1, 6);
        
        // Mark current step as completed
        if (!completedSteps.includes(currentStep)) {
          set({ 
            currentStep: newStep,
            completedSteps: [...completedSteps, currentStep]
          });
        } else {
          set({ currentStep: newStep });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        set({ currentStep: Math.max(currentStep - 1, 1) });
      },

      goToStep: (step) => {
        const { completedSteps, currentStep } = get();
        // Allow going to completed steps or current step
        if (step <= currentStep || completedSteps.includes(step - 1)) {
          set({ currentStep: step });
        }
      },

      markStepCompleted: (step) => {
        const { completedSteps } = get();
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] });
        }
      },

      // Step 1: Datasource
      setDatasource: (datasource) =>
        set((state) => ({
          data: { ...state.data, datasource },
        })),

      // Step 2: Metadata
      setMetadata: (metadata) =>
        set((state) => ({
          data: { ...state.data, metadata },
        })),

      updateMetadataField: (field, value) =>
        set((state) => {
          const metadata = { ...state.data.metadata, [field]: value };
          
          // Auto-generate api_name from display_name
          if (field === 'display_name') {
            metadata.api_name = generateApiName(value);
            metadata.plural_name = generatePluralName(value);
          }
          
          return { data: { ...state.data, metadata } };
        }),

      // Step 3: Properties
      addProperty: (property) =>
        set((state) => ({
          data: {
            ...state.data,
            properties: [...state.data.properties, property],
          },
        })),

      updateProperty: (index, property) =>
        set((state) => {
          const properties = [...state.data.properties];
          properties[index] = property;
          return { data: { ...state.data, properties } };
        }),

      removeProperty: (index) =>
        set((state) => {
          const properties = state.data.properties.filter((_, i) => i !== index);
          return { data: { ...state.data, properties } };
        }),

      setProperties: (properties) =>
        set((state) => ({
          data: { ...state.data, properties },
        })),

      setPrimaryKey: (api_name) =>
        set((state) => {
          const properties = state.data.properties.map((p) => ({
            ...p,
            is_primary_key: p.api_name === api_name,
          }));
          return { 
            data: { 
              ...state.data, 
              properties,
              primary_key: api_name 
            } 
          };
        }),

      setTitleField: (api_name) =>
        set((state) => {
          const properties = state.data.properties.map((p) => ({
            ...p,
            is_title_field: p.api_name === api_name,
          }));
          return { 
            data: { 
              ...state.data, 
              properties,
              title_field: api_name 
            } 
          };
        }),

      autoMapProperties: (columns) =>
        set((state) => {
          const properties: PropertyConfig[] = columns.map((col) => ({
            api_name: generateApiName(col.name),
            display_name: col.name,
            source_column: col.name,
            data_type: inferDataType(col.name, col.sample_values),
            property_type: 'primitive',
            is_required: false,
            is_unique: col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('code'),
            is_searchable: true,
            is_sortable: true,
            is_primary_key: col.name.toLowerCase() === 'id' || col.name.toLowerCase() === 'uuid',
            is_title_field: col.name.toLowerCase().includes('name') || col.name.toLowerCase().includes('title'),
          }));

          // Auto-set primary key and title field if found
          const primaryKey = properties.find(p => p.is_primary_key)?.api_name;
          const titleField = properties.find(p => p.is_title_field)?.api_name;

          return {
            data: {
              ...state.data,
              properties,
              primary_key: primaryKey || '',
              title_field: titleField || '',
            },
          };
        }),

      // Step 4: Relationships
      addRelationship: (relationship) =>
        set((state) => ({
          data: {
            ...state.data,
            relationships: [...state.data.relationships, relationship],
          },
        })),

      updateRelationship: (index, relationship) =>
        set((state) => {
          const relationships = [...state.data.relationships];
          relationships[index] = relationship;
          return { data: { ...state.data, relationships } };
        }),

      removeRelationship: (index) =>
        set((state) => {
          const relationships = state.data.relationships.filter((_, i) => i !== index);
          return { data: { ...state.data, relationships } };
        }),

      setRelationships: (relationships) =>
        set((state) => ({
          data: { ...state.data, relationships },
        })),

      // Step 5: Actions
      addAction: (action) =>
        set((state) => ({
          data: {
            ...state.data,
            actions: [...state.data.actions, action],
          },
        })),

      updateAction: (index, action) =>
        set((state) => {
          const actions = [...state.data.actions];
          actions[index] = action;
          return { data: { ...state.data, actions } };
        }),

      removeAction: (index) =>
        set((state) => {
          const actions = state.data.actions.filter((_, i) => i !== index);
          return { data: { ...state.data, actions } };
        }),

      setActions: (actions) =>
        set((state) => ({
          data: { ...state.data, actions },
        })),

      toggleAction: (index) =>
        set((state) => {
          const actions = [...state.data.actions];
          actions[index] = { ...actions[index], enabled: !actions[index].enabled };
          return { data: { ...state.data, actions } };
        }),

      generateDefaultActions: () =>
        set((state) => {
          const { metadata, properties } = state.data;
          const entityName = metadata.display_name || '实体';
          const writableProps = properties.filter(p => !p.is_primary_key);
          
          const defaultActions: ActionConfig[] = [
            {
              type: 'create',
              enabled: true,
              api_name: `create_${metadata.api_name}`,
              display_name: `创建${entityName}`,
              form_fields: writableProps.map(p => p.api_name),
              required_fields: properties.filter(p => p.is_required).map(p => p.api_name),
              permissions: { type: 'organization' },
            },
            {
              type: 'update',
              enabled: true,
              api_name: `update_${metadata.api_name}`,
              display_name: `修改${entityName}`,
              form_fields: writableProps.map(p => p.api_name),
              required_fields: [],
              permissions: { type: 'organization' },
            },
            {
              type: 'delete',
              enabled: true,
              api_name: `delete_${metadata.api_name}`,
              display_name: `删除${entityName}`,
              form_fields: [],
              required_fields: [],
              permissions: { type: 'organization' },
            },
          ];

          return { data: { ...state.data, actions: defaultActions } };
        }),

      // Step 6: Save Location
      setSaveLocation: (location) =>
        set((state) => ({
          data: { ...state.data, save_location: location },
        })),

      // Validation
      setStepError: (step, errors) =>
        set((state) => ({
          errors: { ...state.errors, [step]: errors },
        })),

      clearStepError: (step) =>
        set((state) => {
          const errors = { ...state.errors };
          delete errors[step];
          return { errors };
        }),

      validateCurrentStep: () => {
        const { currentStep } = get();
        return get().validateStep(currentStep);
      },

      validateStep: (step) => {
        const { data, setStepError, clearStepError } = get();
        const errors: string[] = [];

        clearStepError(step);

        switch (step) {
          case 1:
            // Datasource is optional, but if selected must be valid
            if (data.datasource.source_type === 'existing' && !data.datasource.existing_datasource?.id) {
              errors.push('请选择现有数据源');
            }
            if (data.datasource.source_type === 'new') {
              if (!data.datasource.new_datasource?.type) {
                errors.push('请选择新数据源类型');
              }
            }
            break;

          case 2:
            if (!data.metadata.display_name) {
              errors.push('请输入显示名称');
            }
            if (!data.metadata.api_name) {
              errors.push('请输入 API 名称');
            } else {
              const apiNameRegex = /^[a-z][a-z0-9_]*$/;
              if (!apiNameRegex.test(data.metadata.api_name)) {
                errors.push('API 名称必须以小写字母开头，只包含小写字母、数字和下划线');
              }
            }
            break;

          case 3:
            if (data.properties.length === 0) {
              errors.push('请至少添加一个属性');
            }
            if (!data.primary_key) {
              errors.push('请设置主键字段');
            }
            if (!data.title_field) {
              errors.push('请设置标题字段');
            }
            data.properties.forEach((prop, idx) => {
              if (!prop.api_name) {
                errors.push(`属性 ${idx + 1}: 请输入 API 名称`);
              }
              if (!prop.display_name) {
                errors.push(`属性 ${idx + 1}: 请输入显示名称`);
              }
            });
            break;

          case 4:
            // Relationships are optional
            break;

          case 5:
            if (data.actions.length === 0) {
              errors.push('请至少启用一个操作');
            }
            break;

          case 6:
            if (!data.save_location.project_id) {
              errors.push('请选择保存位置');
            }
            break;
        }

        if (errors.length > 0) {
          setStepError(step, errors);
          return false;
        }

        return true;
      },

      // Submission
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      setLoading: (isLoading) => set({ isLoading }),

      submitWizard: async () => {
        const { data, setSubmitting, markStepCompleted } = get();

        setSubmitting(true);

        try {
          const response = await fetch('http://localhost:5050/api/v1/pipeline/entity/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workspace_id: 'default',
              datasource: data.datasource,
              metadata: data.metadata,
              properties: data.properties,
              primary_key: data.primary_key,
              title_field: data.title_field,
              relationships: data.relationships,
              actions: data.actions.filter(a => a.enabled),
              save_location: data.save_location,
            }),
          });

          const result = await response.json();

          if (result.success) {
            markStepCompleted(5);
            return true;
          } else {
            console.error('Entity creation failed:', result);
            return false;
          }
        } catch (error) {
          console.error('Entity creation error:', error);
          return false;
        } finally {
          setSubmitting(false);
        }
      },

      resetWizard: () =>
        set({
          currentStep: 1,
          completedSteps: [],
          data: initialData,
          errors: {},
          isSubmitting: false,
          isLoading: false,
        }),
    }),
    {
      name: 'entity-pipeline-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        data: state.data,
      }),
    }
  )
);

export default useEntityPipelineStore;
