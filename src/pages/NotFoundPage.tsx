import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '480px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{ fontSize: '1.5rem', color: '#374151', marginBottom: '8px' }}>404</h1>
        <h2 style={{ fontSize: '1.1rem', color: '#374151', marginBottom: '8px' }}>{t('notFound.title')}</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          {t('notFound.message')}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#a21caf',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {t('notFound.backToHome')}
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
