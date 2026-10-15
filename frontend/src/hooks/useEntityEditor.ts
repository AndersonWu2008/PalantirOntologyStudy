/**
 * useEntityEditor Hook
 *
 * Encapsulates edit modal state and save logic for entity renderers.
 * Provides a consistent interface across all renderer components.
 */

import { useState, useCallback } from 'react';

export interface UseEntityEditorOptions {
  /** Called when entity is successfully saved */
  onEntityUpdated?: (entity: Record<string, unknown>) => void;
}

export interface UseEntityEditorReturn {
  /** Whether the edit modal is open */
  isEditModalOpen: boolean;
  /** Open the edit modal */
  handleEdit: () => void;
  /** Close the modal without saving */
  handleCancelEdit: () => void;
  /** Called by EntityEditModal after successful save */
  handleSaveEdit: (updatedData: Record<string, unknown>) => Promise<void>;
}

/**
 * Hook for managing entity edit modal state and save callbacks.
 *
 * @param options - Configuration options
 * @param options.onEntityUpdated - Optional callback fired after successful save
 *
 * @returns Modal state management functions
 *
 * @example
 * ```tsx
 * const MyRenderer: React.FC<Props> = ({ entity, onEntityUpdated }) => {
 *   const { isEditModalOpen, handleEdit, handleCancelEdit, handleSaveEdit } = useEntityEditor({
 *     onEntityUpdated,
 *   });
 *
 *   return (
 *     <>
 *       <Button onClick={handleEdit}>Edit</Button>
 *       <EntityEditModal
 *         open={isEditModalOpen}
 *         entity={entity}
 *         onSave={handleSaveEdit}
 *         onCancel={handleCancelEdit}
 *       />
 *     </>
 *   );
 * };
 * ```
 */
export function useEntityEditor(
  options: UseEntityEditorOptions = {}
): UseEntityEditorReturn {
  const { onEntityUpdated } = options;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedData: Record<string, unknown>) => {
      setIsEditModalOpen(false);
      // Notify parent that entity was updated
      if (onEntityUpdated) {
        onEntityUpdated(updatedData);
      }
    },
    [onEntityUpdated]
  );

  return {
    isEditModalOpen,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
  };
}
