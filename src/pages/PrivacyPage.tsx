import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernButton } from '../components/ui/ModernButton';
import { ModernCard } from '../components/ui/ModernCard';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Last Updated: December 1, 2025
          </p>
        </div>

        <ModernCard variant="elevated" size="lg">
          <div style={{
            fontSize: '16px',
            lineHeight: '1.75',
            color: '#374151'
          }}>
            <p style={{ marginBottom: '24px' }}>
              This Privacy Policy describes how Swizzle ("we", "us", or "our") collects, uses, and shares information about you when you use our website, applications, and services (collectively, the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>

            {/* Section 1 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              1. Information We Collect
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              1.1 Information You Provide
            </h3>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li><strong>Account Information:</strong> Email address, username, and password when you create an account</li>
              <li><strong>Profile Information:</strong> Display name, avatar, and bio</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe</li>
              <li><strong>User Content:</strong> Games you create, including assets and settings</li>
            </ul>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              1.2 Information Collected Automatically
            </h3>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Usage Information:</strong> Pages visited, features used, games played, time spent</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Cookies and Similar Technologies:</strong> Session cookies, analytics cookies, advertising cookies</li>
            </ul>

            {/* Section 2 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              2. How We Use Your Information
            </h2>
            <p style={{ marginBottom: '8px' }}>We use the information we collect to:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Personalize and improve your experience</li>
              <li>Display relevant advertisements</li>
              <li>Detect, investigate, and prevent fraudulent or illegal activities</li>
            </ul>

            {/* Section 3 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              3. Information Sharing
            </h2>
            <p style={{ marginBottom: '8px' }}>We may share your information with:</p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              3.1 Service Providers
            </h3>
            <p style={{ marginBottom: '8px' }}>Third-party vendors who perform services on our behalf, including:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google AdMob:</strong> Advertising services</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
            </ul>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              3.2 Legal Requirements
            </h3>
            <p style={{ marginBottom: '16px' }}>
              We may disclose your information if required by law or in response to legal process.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              3.3 Business Transfers
            </h3>
            <p style={{ marginBottom: '16px' }}>
              In connection with any merger, sale, or transfer of company assets.
            </p>

            {/* Section 4 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              4. Advertising
            </h2>
            <p style={{ marginBottom: '8px' }}>
              We use Google AdMob to display advertisements. AdMob may use cookies and similar technologies to collect information about your device and browsing activity to show you personalized ads. You can opt out of personalized advertising through your device settings or by visiting:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li>Google Ad Settings: <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>https://adssettings.google.com</a></li>
              <li>Network Advertising Initiative: <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>https://optout.networkadvertising.org</a></li>
            </ul>

            {/* Section 5 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              5. Data Retention
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We retain your information for as long as your account is active or as needed to provide you with the Service. We may also retain certain information as required by law or for legitimate business purposes.
            </p>

            {/* Section 6 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              6. Data Security
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>

            {/* Section 7 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              7. Your Rights
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              7.1 For European Users (GDPR)
            </h3>
            <p style={{ marginBottom: '8px' }}>
              If you are located in the European Economic Area, you have the right to:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Object:</strong> Object to processing of your data</li>
            </ul>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              7.2 For California Users (CCPA)
            </h3>
            <p style={{ marginBottom: '8px' }}>
              If you are a California resident, you have the right to:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li>Know what personal information we collect and how we use it</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of your personal information</li>
              <li>Not be discriminated against for exercising your rights</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              To exercise these rights, please contact us using the information below.
            </p>

            {/* Section 8 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              8. International Data Transfers
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
            </p>

            {/* Section 9 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              9. Children's Privacy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>

            {/* Section 10 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              10. Cookies and Tracking Technologies
            </h2>
            <p style={{ marginBottom: '8px' }}>We use cookies and similar tracking technologies for:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li><strong>Essential Cookies:</strong> Required for the Service to function</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service</li>
              <li><strong>Advertising Cookies:</strong> Used to show relevant advertisements</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of the Service.
            </p>

            {/* Section 11 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              11. Changes to This Privacy Policy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on the Service and updating the "Last Updated" date.
            </p>

            {/* Section 12 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              12. Contact Us
            </h2>
            <p style={{ marginBottom: '8px' }}>
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            </p>
            <p style={{ marginBottom: '4px' }}>
              <strong>Email:</strong> <a href="mailto:dondokodongames@gmail.com" style={{ color: '#3b82f6' }}>dondokodongames@gmail.com</a>
            </p>
            <p style={{ marginBottom: '4px' }}>
              <strong>Website:</strong> <a href="https://playswizzle.com" style={{ color: '#3b82f6' }}>https://playswizzle.com</a>
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>Data Protection Officer:</strong> <a href="mailto:dondokodongames@gmail.com" style={{ color: '#3b82f6' }}>dondokodongames@gmail.com</a>
            </p>
          </div>
        </ModernCard>

        {/* Back Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </ModernButton>
        </div>
      </div>
    </div>
  );
};