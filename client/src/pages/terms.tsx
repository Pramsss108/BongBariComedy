import React from "react";

const LAST_UPDATED = "January 17, 2025";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1rem", fontFamily: "inherit" }}>
      <head>
        <title>Terms and Conditions — Bong Bari</title>
        <meta name="description" content="Read the terms for using Bong Bari’s website and digital content, managed by Dopmaine (UDYAM-WB-14-0096694)." />
        <link rel="canonical" href="https://www.bongbari.com/terms" />
      </head>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Terms and Conditions — Bong Bari</h1>
      <div style={{ fontSize: "0.95rem", color: "#555", marginBottom: "1.5rem" }}>Last updated: {LAST_UPDATED}</div>

      <section>
        <h2>About Bong Bari and Dopmaine</h2>
        <p>Bong Bari is a digital media and content production company managed by Dopmaine (UDYAM-WB-14-0096694), based in Kolkata, West Bengal, India. We create Bengali comedy videos, posts, and digital experiences for our audience.</p>
      </section>

      <section>
        <h2>Website Usage</h2>
        <p>By using <a href="https://www.bongbari.com">bongbari.com</a>, you agree to follow these Terms and Conditions. You may browse, share, and enjoy our content for personal, non-commercial use. Do not misuse, copy, or attempt to disrupt our website or services.</p>
      </section>

      <section>
        <h2>User Accounts and Google Authentication</h2>
        <p>By signing up with Google authentication on our platform, you agree to provide accurate information and maintain the security of your account. We use Google's secure authentication system to protect your login credentials.</p>
        <p><strong>Benefits of Signing Up:</strong></p>
        <ul style={{ paddingLeft: "1.5rem", marginTop: "0.5rem" }}>
          <li>Access to our <strong>exclusive newsletter</strong> with behind-the-scenes content, early video releases, and special announcements</li>
          <li><strong>Exciting offers</strong> including early access to merchandise, collaboration opportunities, and fan meetups</li>
          <li>Personalized <strong>Bong Bot chat history</strong> - continue conversations and get customized comedy recommendations</li>
          <li><strong>Community features</strong> - participate in discussions, share feedback, and connect with other Bong Bari fans</li>
          <li>Priority consideration for <strong>brand collaborations and content submissions</strong></li>
        </ul>
        <p>Your account data is securely stored and managed according to our Privacy Policy. You can manage your newsletter preferences and account settings at any time.</p>
      </section>

      <section>
        <h2>Intellectual Property Rights</h2>
        <p>All videos, posts, scripts, and images on Bong Bari are owned by Dopmaine unless otherwise stated. You may not reproduce, distribute, or use our content for commercial purposes without written permission.</p>
      </section>

      <section>
        <h2>Collaborations, Brand Deals, and User-Submitted Ideas</h2>
        <p>We welcome collaborations and brand partnerships. All proposals, ideas, or content submitted by users or brands may be used, modified, or declined at our discretion. Submission does not guarantee acceptance or compensation.</p>
      </section>

      <section>
        <h2>External Links and Third-Party Content</h2>
        <p>Our website may link to external sites or display third-party content (e.g., YouTube, Instagram). Bong Bari is not responsible for the content, privacy, or practices of these external services.</p>
      </section>

      <section>
        <h2>Disclaimer of Liability</h2>
        <p>Bong Bari and Dopmaine make every effort to provide accurate and entertaining content. However, we do not guarantee completeness, reliability, or suitability for any purpose. Use our website and content at your own risk.</p>
      </section>

      <section>
        <h2>Changes to Terms</h2>
        <p>We may update these Terms and Conditions at any time. Changes will be posted on this page with the latest update date. Continued use of our website means you accept the revised terms.</p>
      </section>

      <section>
        <h2>Contact Information</h2>
        <p>If you have questions or concerns, contact us at <a href="mailto:team@bongbari.com">team@bongbari.com</a> or WhatsApp <a href="https://wa.me/919875319691">+91 98753 19691</a>.</p>
      </section>

      <div style={{ margin: "2rem 0 1rem", fontWeight: 500, color: "#333" }}>
        By using our website or contacting us, you agree to these Terms and Conditions.
      </div>

      <footer className="footer" style={{ fontSize: "0.85rem", color: "#888", textAlign: "center", marginTop: "2rem" }}>
        © 2025 Bong Bari | <a href="/">Home</a> | <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms &amp; Conditions</a> | <a href="mailto:team@bongbari.com">team@bongbari.com</a>
      </footer>
    </main>
  );
}
