import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    home: 'الرئيسية',
    homeworks: 'الواجبات',
    qudurat: 'القدرات',
    students: 'الطلاب',
    admin: 'الإدارة',
    login: 'دخول',
    logout: 'تسجيل الخروج',
    search: 'بحث...',
    search_students: 'ابحث باسم الطالب...',
    search_lessons: 'ابحث في شروحات المادة بالاسم...',
    all_classes: 'جميع الفصول',
    class_1_1: '١/١',
    class_1_2: '١/٢',
    class_1_3: '١/٣',
    class_1_4: '١/٤',
    class_1_5: '١/٥',
    class_1_6: '١/٦',
    class_1_7: '١/٧',
    choose_class: 'اختر الفصل',
    filter: 'تصفية',
    refresh: 'تحديث',
    stats: 'الإحصائيات',
    user_management: 'إدارة المستخدمين',
    activity_log: 'سجل النشاط',
    notifications: 'الإشعارات',
    settings: 'الإعدادات',
    close: 'إغلاق',
    back: 'رجوع',
    submit_homework: 'تسليم حل الواجب',
    submitted: 'تم التسليم',
    ended_homeworks: 'الواجبات المنتهية',
    available_homeworks: 'واجبات متاحة',
    details: 'التفاصيل',
    download: 'تحميل',
    preview: 'معاينة',
    notes: 'الملاحظات',
    attach_files: 'إرفاق صور أو ملفات',
    send_solution: 'إرسال الحل',
    saving: 'جاري الحفظ...',
    success_submit: 'تم استلام الحل بنجاح!',
    file_too_large: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.',
    language_label: 'اللغة / Language'
  },
  en: {
    home: 'Home',
    homeworks: 'Homework',
    qudurat: 'Abilities',
    students: 'Students',
    admin: 'Admin',
    login: 'Sign In',
    logout: 'Sign Out',
    search: 'Search...',
    search_students: 'Search student name...',
    search_lessons: 'Search lesson name...',
    all_classes: 'All Classes',
    class_1_1: 'Class 1/1',
    class_1_2: 'Class 1/2',
    class_1_3: 'Class 1/3',
    class_1_4: 'Class 1/4',
    class_1_5: 'Class 1/5',
    class_1_6: 'Class 1/6',
    class_1_7: 'Class 1/7',
    choose_class: 'Select Class',
    filter: 'Filter',
    refresh: 'Refresh',
    stats: 'Statistics',
    user_management: 'User Management',
    activity_log: 'Activity Log',
    notifications: 'Notifications',
    settings: 'Settings',
    close: 'Close',
    back: 'Back',
    submit_homework: 'Submit Homework Solution',
    submitted: 'Submitted',
    ended_homeworks: 'Ended Homeworks',
    available_homeworks: 'Available Homeworks',
    details: 'Details',
    download: 'Download',
    preview: 'Preview',
    notes: 'Notes',
    attach_files: 'Attach Photos or Files',
    send_solution: 'Send Solution',
    saving: 'Saving...',
    success_submit: 'Solution submitted successfully!',
    file_too_large: 'File is too large. Maximum size is 10 MB.',
    language_label: 'Language / اللغة'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isRTL: true,
  t: (key, defaultText) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thanaweya_app_lang');
      if (saved === 'en' || saved === 'ar') return saved;
    }
    return 'ar';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('thanaweya_app_lang', language);
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    return defaultText !== undefined ? defaultText : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isRTL,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
