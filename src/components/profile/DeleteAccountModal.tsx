import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface DeleteAccountModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose, onDeleted }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmWord = t('profile.deleteAccount.confirmWord');
  const canConfirm = confirmText.trim() === confirmWord;

  const handleDelete = async () => {
    if (!canConfirm || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('delete-account');
      if (invokeError || !data?.deleted) {
        throw invokeError || new Error('delete failed');
      }
      await supabase.auth.signOut();
      onDeleted();
    } catch (err) {
      console.error('[DeleteAccountModal] delete failed:', err);
      setError(t('profile.deleteAccount.failed'));
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
      onClick={() => !deleting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        }}
      >
        {step === 1 ? (
          <>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#dc2626' }}>{t('profile.deleteAccount.step1Title')}</h3>
            <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              {t('profile.deleteAccount.step1Body')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(2)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                {t('profile.deleteAccount.continue')}
              </button>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer' }}
              >
                {t('profile.deleteAccount.cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#dc2626' }}>{t('profile.deleteAccount.step2Title')}</h3>
            <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              {t('profile.deleteAccount.step2Body')}
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t('profile.deleteAccount.confirmPlaceholder') || ''}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 16,
              }}
            />
            {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={!canConfirm || deleting}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: canConfirm ? '#dc2626' : '#f3a8a8',
                  color: 'white',
                  cursor: canConfirm && !deleting ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                {deleting ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirmDelete')}
              </button>
              <button
                onClick={onClose}
                disabled={deleting}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer' }}
              >
                {t('profile.deleteAccount.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountModal;
