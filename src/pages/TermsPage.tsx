import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernButton } from '../components/ui/ModernButton';
import { ModernCard } from '../components/ui/ModernCard';

export const TermsPage: React.FC = () => {
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
            Terms of Service
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
              Welcome to Swizzle! These Terms of Service ("Terms") govern your use of the Swizzle platform, including our website, applications, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
            </p>

            {/* Section 1 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              By creating an account or using Swizzle, you confirm that you are at least 13 years old (or the minimum age required in your jurisdiction) and have the legal capacity to enter into these Terms. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms.
            </p>

            {/* Section 2 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              2. Description of Service
            </h2>
            <p style={{ marginBottom: '8px' }}>
              Swizzle is a short-game creation and sharing platform that allows users to:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li>Create games using templates and customization tools</li>
              <li>Play games created by other users and AI-generated content</li>
              <li>Remix existing games to create new variations</li>
              <li>Share games with the community</li>
              <li>Access premium features through subscription plans</li>
            </ul>

            {/* Section 3 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              3. User Accounts
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              3.1 Account Creation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              3.2 Account Termination
            </h3>
            <p style={{ marginBottom: '16px' }}>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.
            </p>

            {/* Section 4 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              4. User Content
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              4.1 Ownership
            </h3>
            <p style={{ marginBottom: '16px' }}>
              You retain ownership of the original content you create on Swizzle. However, by posting content, you grant Swizzle a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display your content in connection with the Service.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              4.2 Content Standards
            </h3>
            <p style={{ marginBottom: '8px' }}>You agree not to post content that:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px' }}>
              <li>Is illegal, harmful, threatening, abusive, or harassing</li>
              <li>Contains sexually explicit material or violence</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains malware or harmful code</li>
              <li>Violates the privacy of others</li>
            </ul>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              4.3 Content Moderation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              We reserve the right to remove any content that violates these Terms or that we deem inappropriate, without prior notice.
            </p>

            {/* Section 5 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              5. Remix Feature
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              5.1 Remix Rights
            </h3>
            <p style={{ marginBottom: '16px' }}>
              By publishing a game on Swizzle, you grant other users the right to remix your game's structure and mechanics. Remixed games will maintain a link to the original game and its creator.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              5.2 Limitations
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The remix feature applies only to game templates and AI-generated assets. Users may not remix content that includes copyrighted materials uploaded by the original creator without permission.
            </p>

            {/* Section 6 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              6. AI-Generated Content
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Swizzle uses artificial intelligence to generate games, images, and other content. AI-generated content is provided "as is" and may contain errors or inaccuracies. You acknowledge that AI-generated content is not created by human authors and may be similar to content generated for other users.
            </p>

            {/* Section 7 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              7. Subscription and Payments
            </h2>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              7.1 Premium Plans
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Swizzle offers premium subscription plans with additional features. Subscription fees are billed in advance on a monthly or annual basis and are non-refundable except as required by law.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              7.2 Free Tier Limitations
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Free accounts are limited to creating a certain number of games per month. These limits may change at our discretion.
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginTop: '20px', marginBottom: '12px' }}>
              7.3 Cancellation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of the current billing period.
            </p>

            {/* Section 8 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              8. Advertising
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Swizzle displays advertisements through third-party advertising networks. By using the Service, you consent to the display of advertisements. Premium subscribers may have access to reduced or ad-free experiences.
            </p>

            {/* Section 9 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              9. Intellectual Property
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Swizzle platform, including its design, features, and technology, is owned by Swizzle and protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without our prior written consent.
            </p>

            {/* Section 10 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              10. Disclaimer of Warranties
            </h2>
            <p style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '14px' }}>
              The service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free.
            </p>

            {/* Section 11 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              11. Limitation of Liability
            </h2>
            <p style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '14px' }}>
              To the maximum extent permitted by law, Swizzle shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
            </p>

            {/* Section 12 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              12. Indemnification
            </h2>
            <p style={{ marginBottom: '16px' }}>
              You agree to indemnify and hold harmless Swizzle and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>

            {/* Section 13 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              13. Governing Law
            </h2>
            <p style={{ marginBottom: '16px' }}>
              These Terms shall be governed by and construed in accordance with the laws of Japan, without regard to its conflict of law provisions.
            </p>

            {/* Section 14 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              14. Changes to Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may update these Terms from time to time. We will notify you of any material changes by posting the new Terms on the Service. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
            </p>

            {/* Section 15 */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              15. Contact Us
            </h2>
            <p style={{ marginBottom: '8px' }}>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p style={{ marginBottom: '4px' }}>
              <strong>Email:</strong> <a href="mailto:dondokodongames@gmail.com" style={{ color: '#3b82f6' }}>dondokodongames@gmail.com</a>
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>Website:</strong> <a href="https://playswizzle.com" style={{ color: '#3b82f6' }}>https://playswizzle.com</a>
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