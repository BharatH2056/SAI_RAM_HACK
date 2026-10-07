// src/components/ErrorBoundary.jsx - React Error Boundary wrapper
import React, { Component } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import Button from './shared/Button.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'var(--gh-surface)',
              border: '1px solid var(--gh-danger-border)',
              borderRadius: 'var(--gh-radius-lg)',
              padding: '32px',
              textAlign: 'center',
              boxShadow: 'var(--gh-shadow-lg)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--gh-danger-light)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertOctagon size={32} color="var(--gh-danger)" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
              Unexpected System Error
            </h2>
            <p
              style={{
                color: 'var(--gh-text-muted)',
                fontSize: '0.92rem',
                marginBottom: '20px',
              }}
            >
              {this.state.error?.message || 'A critical rendering fault occurred.'}
            </p>
            <Button
              variant="primary"
              onClick={this.handleReset}
              icon={<RotateCcw size={16} />}
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
