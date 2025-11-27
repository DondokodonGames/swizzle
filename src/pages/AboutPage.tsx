import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernButton } from '../components/ui/ModernButton';
import { ModernCard } from '../components/ui/ModernCard';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('dondokodongames@gmail.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

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
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎮</div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px'
          }}>
            About Swizzle
          </h1>
          <p style={{ color: '#6b7280', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            The ultimate platform for creating and playing short games. Make games with just 3 taps!
          </p>
        </div>

        {/* Main Content */}
        <ModernCard variant="elevated" size="lg">
          <div style={{
            fontSize: '16px',
            lineHeight: '1.75',
            color: '#374151'
          }}>
            {/* What is Swizzle */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
              What is Swizzle?
            </h2>
            <p style={{ marginBottom: '24px' }}>
              Swizzle is a revolutionary short-game platform designed for the TikTok generation. We believe that game creation should be as easy and fun as playing games themselves. With Swizzle, anyone can create, share, and play bite-sized gaming experiences in seconds—no coding skills required.
            </p>

            {/* Mission */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              Our Mission
            </h2>
            <p style={{ marginBottom: '24px' }}>
              We're democratizing game creation by making it accessible to everyone. Whether you're a student, teacher, creative professional, or just someone who loves games, Swizzle empowers you to bring your ideas to life instantly. Our platform combines the simplicity of social media with the creativity of game development, creating a new form of interactive entertainment.
            </p>

            {/* Key Features */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              Key Features
            </h2>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                🎨 Create Games in 3 Taps
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Our intuitive editor lets you create games faster than ever. Choose a template, customize the assets, and publish—all in under a minute. No complex menus, no overwhelming options, just pure creative flow.
              </p>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                🎮 Play Endless Games
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Discover thousands of unique games created by our community and powered by AI. Every swipe brings a new gaming experience. From action-packed challenges to relaxing puzzles, there's something for everyone.
              </p>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                🔄 Remix and Customize
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Love a game? Make it your own! Our unique remix feature lets you take any game and customize it with your own twist. Change colors, adjust difficulty, add new elements—the possibilities are endless.
              </p>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                🤖 AI-Powered Generation
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Our platform uses advanced AI to generate thousands of games monthly, ensuring you always have fresh content to play. AI-created templates give you a head start on your own creations.
              </p>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                🌍 Global Community
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Join creators from around the world. Share your games, discover trending content, and connect with players who love your creations. Our icon-based interface transcends language barriers.
              </p>
            </div>

            {/* Who It's For */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              Who is Swizzle For?
            </h2>
            <ul style={{ marginLeft: '24px', marginBottom: '24px' }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Students:</strong> Learn game design concepts while having fun creating interactive projects
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Teachers:</strong> Use games as engaging educational tools for any subject
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Content Creators:</strong> Generate unique gaming content for your social media channels
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Game Enthusiasts:</strong> Express your creativity without learning complex game engines
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Businesses:</strong> Create interactive marketing experiences and branded mini-games
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Anyone:</strong> If you enjoy games and want to create, Swizzle is for you!
              </li>
            </ul>

            {/* Technology */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              Our Technology
            </h2>
            <p style={{ marginBottom: '24px' }}>
              Swizzle is built on cutting-edge web technologies including React, TypeScript, PixiJS for high-performance graphics, and powered by advanced AI models from Anthropic and OpenAI. Our platform is designed to work seamlessly across all devices—from smartphones to desktop computers—ensuring everyone can create and play anywhere, anytime.
            </p>

            {/* Vision */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              Our Vision
            </h2>
            <p style={{ marginBottom: '24px' }}>
              We envision a future where game creation is as ubiquitous as photo sharing. Where anyone with an idea can transform it into an interactive experience in seconds. Where the next generation of game creators emerges not from traditional studios, but from a global community of creative minds on platforms like Swizzle. We're building the tools that will empower millions to express themselves through interactive media.
            </p>

            {/* Statistics */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '32px', marginBottom: '16px' }}>
              By The Numbers
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>
                  250+
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Games Available
                </div>
              </div>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ec4899', marginBottom: '8px' }}>
                  3 Taps
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  To Create a Game
                </div>
              </div>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
                  22+
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Game Templates
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#111827', marginTop: '40px', marginBottom: '16px' }}>
              Contact Us
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Have questions, feedback, or just want to say hi? We'd love to hear from you!
            </p>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  📧 Email
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <a 
                    href="mailto:dondokodongames@gmail.com" 
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    dondokodongames@gmail.com
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: emailCopied ? '#10b981' : '#e5e7eb',
                      color: emailCopied ? '#fff' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {emailCopied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  🌐 Website
                </div>
                <a 
                  href="https://playswizzle.com" 
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  https://playswizzle.com
                </a>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  ⏰ Response Time
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  We typically respond within 24-48 hours
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div style={{
              borderTop: '2px solid #e5e7eb',
              paddingTop: '24px',
              marginTop: '32px'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                Important Links
              </h3>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/terms')}
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '500',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  📄 Terms of Service
                </button>
                <button
                  onClick={() => navigate('/privacy')}
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '500',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  🔒 Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* Back Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <ModernButton
            variant="outline"
            size="md"
            onClick={() => navigate('/')}
          >
            ← Back to Game
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
