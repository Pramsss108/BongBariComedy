/**
 * NglStitchDashboard — Phase 1: Visual Port + Core Logic
 * Combines Stitch Home + Inbox screens. Wires username/back/logout/copy.
 * Route: /ngl/stitch-dashboard/:username
 */
import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import './NglStitchDashboard.css';

type Tab = 'home' | 'inbox';

export default function NglStitchDashboard() {
  const [tab, setTab] = useState<Tab>('home');
  const params = useParams<{ username?: string }>();
  const [, navigate] = useLocation();

  const username = (params.username || 'user').replace(/^@/, '');
  const initial = username.charAt(0).toUpperCase();
  const shareLink = `bongbari.com/ngl/q/${username}`;
  const fullShareUrl = `https://www.bongbari.com/ngl/q/${username}`;

  const handleBack = () => navigate('/ngl');
  const handleLogout = () => {
    try { localStorage.removeItem('bong_ngl'); } catch {}
    navigate('/ngl');
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = fullShareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };
  const handleShare = async (platform: 'whatsapp' | 'instagram' | 'story' | 'more') => {
    const text = `Send me anonymous messages! ${fullShareUrl}`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'more' && navigator.share) {
      try { await navigator.share({ title: 'Bong Bari NGL', text, url: fullShareUrl }); } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <>
      {/* Font Awesome CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      {/* Material Symbols for Inbox */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      {/* Inter + Manrope fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
      />

      <div className="stitch-root">
        {/* ===== TOP HEADER (shared) ===== */}
        <header className="stitch-header">
          {/* Back Button */}
          <button className="stitch-back-btn" onClick={handleBack}>
            <i className="fa-solid fa-arrow-left" /> Back
          </button>

          {/* Center Navigation Tabs */}
          <div className="stitch-tab-switcher">
            <button
              className={`stitch-tab ${tab === 'home' ? 'stitch-tab--active' : 'stitch-tab--inactive'}`}
              onClick={() => setTab('home')}
            >
              <i className="fa-solid fa-house" /> Home
            </button>
            <button
              className={`stitch-tab ${tab === 'inbox' ? 'stitch-tab--active' : 'stitch-tab--inactive'}`}
              onClick={() => setTab('inbox')}
            >
              <i className="fa-solid fa-inbox" /> Inbox
            </button>
          </div>

          {/* User Section — avatar only (username lives in PRO card) */}
          <div className="stitch-user-section">
            <div className="stitch-lang-pill">
              EN <i className="fa-solid fa-chevron-down stitch-chevron" />
            </div>
            <button className="stitch-logout-btn" onClick={handleLogout}>Logout</button>
            <div className="stitch-user-info">
              <div className="stitch-avatar-small">{initial}</div>
            </div>
          </div>
        </header>

        {/* ===== HOME TAB ===== */}
        {tab === 'home' && (
          <main className="stitch-main">
            {/* PRO Feature Card */}
            <section className="stitch-pro-card glossy-effect">
              {/* Pro Ribbon */}
              <div className="stitch-pro-ribbon-wrap">
                <div className="stitch-pro-ribbon">
                  <span className="stitch-pro-ribbon-text">PRO</span>
                </div>
              </div>
              {/* Center User Info */}
              <div className="stitch-pro-user">
                <div className="stitch-avatar-large">{initial}</div>
                <span className="stitch-avatar-label">@{username}</span>
              </div>
              {/* Price Info */}
              <div className="stitch-pro-price">
                <div className="stitch-pro-price-title">PRO</div>
                <div className="stitch-pro-price-amount">
                  ₹98<span className="stitch-pro-price-period">/mo</span>
                </div>
              </div>
            </section>

            {/* Grid Content */}
            <div className="stitch-grid">
              {/* Left: Anonymous Question Card */}
              <section className="stitch-prompt-card">
                <div className="stitch-prompt-label">
                  <span>What people see</span>
                </div>
                <div className="stitch-prompt-text">
                  <h2>
                    আমার সম্পর্কে anonymous <br /> কিছু বলো
                  </h2>
                </div>
                <div className="stitch-prompt-actions">
                  <button className="stitch-prompt-btn">
                    <i className="fa-solid fa-shuffle stitch-gold-icon" /> AI Shuffle
                  </button>
                  <button className="stitch-prompt-btn">
                    <i className="fa-solid fa-pen stitch-gold-icon" /> Edit
                  </button>
                </div>
              </section>

              {/* Right: Actions Column */}
              <div className="stitch-actions-col">
                {/* WhatsApp Verify Card */}
                <div className="stitch-verify-card glossy-effect">
                  <div className="stitch-verify-info">
                    <span className="stitch-verify-title">Verify WhatsApp</span>
                    <span className="stitch-verify-subtitle">Not added</span>
                  </div>
                  <button className="stitch-btn-gold stitch-verify-btn">Start</button>
                </div>

                {/* Link Share Card */}
                <div className="stitch-link-card">
                  <span className="stitch-link-label">Shareable link</span>
                  <div className="stitch-link-row">
                    <span className="stitch-link-url">{shareLink}</span>
                    <button className="stitch-btn-gold stitch-copy-btn" onClick={handleCopy}>Copy</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <section className="stitch-share-grid">
              <button className="stitch-share-card stitch-glow-green" onClick={() => handleShare('whatsapp')}>
                <div className="stitch-share-icon stitch-share-icon--green">
                  <i className="fa-brands fa-whatsapp" />
                </div>
                <span className="stitch-share-label">WhatsApp</span>
              </button>
              <button className="stitch-share-card stitch-glow-pink" onClick={() => handleShare('instagram')}>
                <div className="stitch-share-icon stitch-share-icon--pink">
                  <i className="fa-brands fa-instagram" />
                </div>
                <span className="stitch-share-label">IG Story</span>
              </button>
              <button className="stitch-share-card stitch-glow-purple" onClick={() => handleShare('story')}>
                <div className="stitch-share-icon stitch-share-icon--purple">
                  <i className="fa-solid fa-clone" />
                </div>
                <span className="stitch-share-label">Story Card</span>
              </button>
              <button className="stitch-share-card stitch-glow-blue" onClick={() => handleShare('more')}>
                <div className="stitch-share-icon stitch-share-icon--blue">
                  <i className="fa-solid fa-ellipsis" />
                </div>
                <span className="stitch-share-label">More</span>
              </button>
            </section>
          </main>
        )}

        {/* ===== INBOX TAB ===== */}
        {tab === 'inbox' && (
          <main className="stitch-main stitch-inbox-main">
            {/* Header & Search */}
            <header className="stitch-inbox-header">
              <div>
                <h1 className="stitch-inbox-title">Inbox</h1>
                <p className="stitch-inbox-subtitle">Review your latest communications securely.</p>
              </div>
              <div className="stitch-search-wrap">
                <div className="stitch-search-icon-wrap">
                  <span className="material-symbols-outlined stitch-search-icon">search</span>
                </div>
                <input
                  className="stitch-search-input"
                  placeholder="Search messages, locations, or devices..."
                  type="text"
                />
              </div>
            </header>

            {/* Message List */}
            <section className="stitch-msg-list">
              {/* Message Card 1 (Blurred/Hidden) */}
              <article className="stitch-msg-card">
                <div className="stitch-msg-top">
                  <div className="stitch-msg-badge">
                    <div className="stitch-msg-dot" />
                    <span className="stitch-msg-badge-text">New Lead</span>
                  </div>
                  <div className="stitch-msg-meta">
                    <span className="stitch-msg-time">2m ago</span>
                    <span
                      className="material-symbols-outlined stitch-pin-icon"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      keep
                    </span>
                    <button className="stitch-msg-menu-btn">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>

                <div className="stitch-msg-blur-wrap">
                  <div className="stitch-msg-blurred">
                    <p>
                      Hi Bong Bari team, I'm interested in booking the entire venue for a
                      private event next month. Could you provide a quote for 50 guests
                      including catering?
                    </p>
                  </div>
                  <div className="stitch-msg-reveal-overlay">
                    <button className="stitch-reveal-btn">
                      <span className="material-symbols-outlined stitch-reveal-icon">visibility_off</span>
                      Tap to reveal
                    </button>
                  </div>
                </div>

                <div className="stitch-msg-footer">
                  <div className="stitch-reactions">
                    <button className="stitch-reaction stitch-reaction--active">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
                      >
                        favorite
                      </span>
                    </button>
                    <button className="stitch-reaction">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lightbulb</span>
                    </button>
                    <button className="stitch-reaction">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>rocket_launch</span>
                    </button>
                  </div>
                  <div className="stitch-hints">
                    <span className="stitch-hint-pill">India</span>
                    <span className="stitch-hint-pill">Mobile</span>
                    <span className="stitch-hint-pill">Chrome</span>
                    <span className="stitch-hint-pill">Jio</span>
                    <span className="stitch-hint-pill stitch-hint-pro">
                      <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>lock</span>
                      13 more — PRO
                    </span>
                  </div>
                </div>
              </article>

              {/* Message Card 2 (Revealed) */}
              <article className="stitch-msg-card">
                <div className="stitch-msg-top">
                  <div className="stitch-msg-sender">
                    <div className="stitch-msg-sender-avatar">R</div>
                    <span className="stitch-msg-sender-name">Anonymous</span>
                  </div>
                  <div className="stitch-msg-meta">
                    <span className="stitch-msg-time">1h ago</span>
                    <button className="stitch-msg-menu-btn">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
                <div className="stitch-msg-content">
                  <p>
                    Absolutely stunning location! We visited yesterday and were blown away by the
                    attention to detail. Could you share the availability for the first week of
                    November?
                  </p>
                </div>
                <div className="stitch-msg-footer">
                  <div className="stitch-reactions">
                    <button className="stitch-reaction">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>favorite</span>
                    </button>
                    <button className="stitch-reaction">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lightbulb</span>
                    </button>
                  </div>
                  <div className="stitch-hints">
                    <span className="stitch-hint-pill">UK</span>
                    <span className="stitch-hint-pill">Desktop</span>
                    <span className="stitch-hint-pill">Safari</span>
                  </div>
                </div>
              </article>

              {/* Message Card 3 */}
              <article className="stitch-msg-card stitch-msg-card--faded">
                <div className="stitch-msg-top">
                  <div className="stitch-msg-sender">
                    <div className="stitch-msg-sender-avatar">A</div>
                    <span className="stitch-msg-sender-name">Anonymous</span>
                  </div>
                  <div className="stitch-msg-meta">
                    <span className="stitch-msg-time">Yesterday</span>
                    <button className="stitch-msg-menu-btn">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
                <div className="stitch-msg-content stitch-msg-content--dim">
                  <p>Following up on the invoice #BB-2024-89...</p>
                </div>
              </article>

              {/* Message Card 4 */}
              <article className="stitch-msg-card stitch-msg-card--dim">
                <div className="stitch-msg-top">
                  <div className="stitch-msg-sender">
                    <div className="stitch-msg-sender-avatar">M</div>
                    <span className="stitch-msg-sender-name">Anonymous</span>
                  </div>
                  <div className="stitch-msg-meta">
                    <span className="stitch-msg-time">Oct 12</span>
                    <button className="stitch-msg-menu-btn">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
                <div className="stitch-msg-content stitch-msg-content--dim">
                  <p>Weekly social media performance report is ready.</p>
                </div>
              </article>
            </section>

            {/* Export Button */}
            <div className="stitch-export-wrap">
              <button className="stitch-btn-gold stitch-export-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                Export Inbox
              </button>
            </div>
          </main>
        )}

        {/* Delete Icon (Floating bottom right) */}
        <div className="stitch-floating-delete">
          <button className="stitch-delete-btn">
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="stitch-mobile-nav">
          <button
            className={`stitch-mobile-tab ${tab === 'home' ? 'stitch-mobile-tab--active' : ''}`}
            onClick={() => setTab('home')}
          >
            <span className="material-symbols-outlined">home</span>
            <span className="stitch-mobile-tab-label">Home</span>
          </button>
          <button
            className={`stitch-mobile-tab ${tab === 'inbox' ? 'stitch-mobile-tab--active' : ''}`}
            onClick={() => setTab('inbox')}
          >
            <span
              className="material-symbols-outlined"
              style={tab === 'inbox' ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              mail
            </span>
            <span className="stitch-mobile-tab-label">Inbox</span>
            {tab === 'inbox' && <div className="stitch-mobile-tab-indicator" />}
          </button>
        </nav>
      </div>
    </>
  );
}
