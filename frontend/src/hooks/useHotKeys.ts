/**
 * useHotKeys Hook
 * 键盘快捷键管理
 */

import { useEffect, useCallback } from 'react';

export interface HotKey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export interface UseHotKeysOptions {
  enabled?: boolean;
}

export const useHotKeys = (hotkeys: HotKey[], options: UseHotKeysOptions = {}): void => {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 忽略在 input/textarea/select 中的快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // 除了 Escape 键，其他快捷键在输入框中不触发
        if (event.key !== 'Escape') {
          return;
        }
      }

      hotkeys.forEach((hotkey) => {
        const ctrlMatch = hotkey.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = hotkey.alt ? event.altKey : !event.altKey;

        // 处理 meta 键 (Mac 的 Cmd)
        const metaMatch = hotkey.meta !== undefined
          ? (hotkey.meta ? event.metaKey : !event.metaKey)
          : true;

        if (
          event.key.toLowerCase() === hotkey.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch &&
          metaMatch
        ) {
          event.preventDefault();
          hotkey.handler();
        }
      });
    },
    [hotkeys, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

export default useHotKeys;
