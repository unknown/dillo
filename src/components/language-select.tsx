import { useState } from "react";

export type Language = {
  id: string;
  name: string;
};

export interface LanguageSelectProps {
  languages: Language[];
  initialLanguage?: Language;
  onLanguageChange?: (language: Language) => void;
}

export function LanguageSelect({
  languages,
  initialLanguage,
  onLanguageChange,
}: LanguageSelectProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage ?? languages[0]);

  return (
    <select
      onChange={
        onLanguageChange &&
        ((event) => {
          if (event.target.value === selectedLanguage.id) {
            return;
          }
          const newLanguage = languages.find((language) => language.id === event.target.value);
          if (!newLanguage) {
            return;
          }
          setSelectedLanguage(newLanguage);
          onLanguageChange(newLanguage);
        })
      }
      value={selectedLanguage.id}
    >
      {languages.map((language) => (
        <option key={language.id} value={language.id}>
          {language.name}
        </option>
      ))}
    </select>
  );
}
