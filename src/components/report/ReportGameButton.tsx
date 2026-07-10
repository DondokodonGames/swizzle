import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useSupabaseUser } from '../../hooks/useSupabaseUser';

const REASONS = ['inappropriate', 'copyright', 'spam', 'other'] as const;

export const ReportGameButton: React.FC<{ gameId: string }> = ({ gameId }) => {
  const { t } = useTranslation();
  const { user } = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('inappropriate');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from('game_reports').insert({
      game_id: gameId,
      reporter_id: user?.id ?? null,
      reason,
      detail: detail.trim() || null,
    });
    setSubmitting(false);
    if (!error) setDone(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        {t('report.trigger')}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              borderRadius: 16,
              padding: 24,
              maxWidth: 360,
              width: '100%',
            }}
          >
            {done ? (
              <>
                <p style={{ marginBottom: 16 }}>{t('report.thanks')}</p>
                <button
                  onClick={() => setOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#a855f7', color: 'white', cursor: 'pointer' }}
                >
                  {t('common.close')}
                </button>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 12 }}>{t('report.title')}</h3>
                <div style={{ marginBottom: 12 }}>
                  {REASONS.map((r) => (
                    <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 14 }}>
                      <input
                        type="radio"
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      {t(`report.reasons.${r}`)}
                    </label>
                  ))}
                </div>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={t('report.detailPlaceholder') || ''}
                  rows={3}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    padding: 10,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {submitting ? t('common.processing') : t('report.submit')}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#e2e8f0', cursor: 'pointer' }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportGameButton;
