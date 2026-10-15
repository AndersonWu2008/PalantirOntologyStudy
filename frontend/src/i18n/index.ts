/**
 * i18n Configuration
 * 国际化配置
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const resources = {
  en: {
    translation: en,
  },
  'zh-CN': {
    translation: zhCN,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getAvailableLanguages = () => [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
];
