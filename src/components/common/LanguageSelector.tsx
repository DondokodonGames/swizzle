import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../i18n';

interface LanguageSelectorProps {
  className?: string;
  showNativeName?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  showNativeName = true
}) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleLanguageChange}
      className={`px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {showNativeName ? lang.nativeName : lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;
