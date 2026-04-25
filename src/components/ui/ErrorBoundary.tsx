import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #fce7ff 0%, #ccfbf1 100%)'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#374151', marginBottom: '8px' }}>予期しないエラーが発生しました</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              {this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
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
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
