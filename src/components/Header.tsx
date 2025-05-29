// src/components/Header.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../types/SupportedLanguage';

interface HeaderProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onToggleSettings: () => void;
  isGoogleSignedIn: boolean;
  onSignInClick: () => void;
  onSignOutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  onToggleSettings,
  isGoogleSignedIn,
  onSignInClick,
  onSignOutClick,
}) => {
  const { t } = useTranslation();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container-xl">
        {/* 
          We need another div here to act as the flex container for brand and nav items 
          because `container-xl` itself isn't a flex container by default in a way
          that directly aligns navbar-brand and the ms-auto items.
        */}
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="navbar-brand fw-bold d-flex align-items-center">
            <i className="bi bi-robot me-2"></i>
            {t('appName')}
          </div>

          <div className="navbar-nav d-flex flex-row align-items-center">
            <i className="bi bi-translate m-1 text-white"></i>
            <div className="nav-item me-3">
              <div
                className="btn-group"
                role="group"
                aria-label={t('header.languageSelectionLabel')}
              >
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`btn btn-sm ${currentLanguage === 'en' ? 'btn-light' : 'btn-outline-light'}`}
                  disabled={currentLanguage === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('es')}
                  className={`btn btn-sm ${currentLanguage === 'es' ? 'btn-light' : 'btn-outline-light'}`}
                  disabled={currentLanguage === 'es'}
                >
                  ES
                </button>
              </div>
            </div>
            <div className="nav-item me-3">
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={onToggleSettings}
                aria-label={t('header.settingsAriaLabel')}
              >
                <i className="bi bi-gear-fill"></i>
              </button>
            </div>

            <div className="nav-item">
              {isGoogleSignedIn ? (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={onSignOutClick}
                >
                  <i className="bi bi-google me-2"></i>
                  {t('header.signOut')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onSignInClick}
                >
                  <i className="bi bi-google me-2"></i>
                  {t('header.signIn')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
