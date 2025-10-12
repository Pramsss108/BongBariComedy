import React from "react";

const LAST_UPDATED = "October 13, 2025";

export default function PrivacyPolicy() {
  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "#ffcb05",
        width: "100vw",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: -1
      }} />
      <div 
        className="privacy-container"
        style={{
          maxWidth: 900,
          margin: "2rem auto 1rem auto",
          background: "#fff",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
          position: "relative"
        }}>
        <title>Privacy Policy — Bong Bari</title>
        <meta name="description" content="Full privacy policy for Bong Bari, operated by Dopmaine (UDYAM-WB-14-0096694), Kolkata, India." />
        <link rel="canonical" href="https://www.bongbari.com/privacy" />

        {/* Fixed Header */}
        <div 
          className="privacy-header"
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "1.5rem 2rem 1rem 2rem",
            zIndex: 10
          }}>
          <h1 className="privacy-title" style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "0.05rem", textAlign: "center", color: "#1a237e", margin: 0 }}>Privacy Policy — Bong Bari</h1>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", marginTop: "0.05rem" }}>Last Updated: October 2025</div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="custom-scrollbar privacy-content"
          style={{
            maxHeight: "80vh",
            overflowY: "auto",
            padding: "1.5rem 2rem 2rem 2rem",
            scrollBehavior: "smooth",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 #f1f5f9"
          }}>

        {/* Add custom scrollbar and responsive CSS */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
          }
          
          @media (max-width: 768px) {
            .privacy-container {
              margin: 1rem !important;
              max-width: calc(100vw - 2rem) !important;
            }
            .privacy-header {
              padding: 1rem 1rem 0.75rem 1rem !important;
            }
            .privacy-content {
              padding: 1rem 1rem 1.5rem 1rem !important;
              max-height: 70vh !important;
            }
            .privacy-title {
              font-size: 1.75rem !important;
            }
            .privacy-footer {
              margin: 0 1rem 2rem 1rem !important;
              max-width: calc(100vw - 2rem) !important;
            }
          }
          
          @media (max-width: 480px) {
            .privacy-content {
              max-height: 65vh !important;
            }
            .privacy-title {
              font-size: 1.5rem !important;
            }
          }
        `}</style>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>About This Privacy Policy</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Hey there! We're Bong Bari, a comedy content brand run by our team at Dopmaine (UDYAM-WB-14-0096694) in Kolkata. We create funny Bengali videos and digital content that hopefully makes you laugh.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>This privacy policy tells you how we handle your information when you visit our website (<a href="https://www.bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com</a>), follow us on social media, or get in touch with us through WhatsApp or email.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>By using our website or contacting us, you're okay with how we handle your data as described here.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>2. Our Commitment to Privacy</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We believe in being honest and transparent. We follow Indian privacy laws (Information Technology Act 2000 and Digital Personal Data Protection Act 2023) and international best practices to keep your data safe.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>We only collect what we actually need, keep it secure, and respect your right to control your own information.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>3. Scope of This Policy</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>This policy covers every digital touch-point owned or managed by Bong Bari:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>our public website and sub-pages,</li>
            <li style={{ marginBottom: "0.05rem" }}>lead or collaboration forms,</li>
            <li style={{ marginBottom: "0.05rem" }}>WhatsApp Business number (+91 98753 19691),</li>
            <li style={{ marginBottom: "0.05rem" }}>social-media pages under our verified handles, and</li>
            <li style={{ marginBottom: "0.05rem" }}>communications conducted through Meta Business Manager.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>It does not extend to third-party sites or services linked from our content.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4. Information We Collect</h2>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4.1 Data You Provide Directly</h3>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>Name, email address, and phone number entered in contact or collaboration forms.</li>
            <li style={{ marginBottom: "0.05rem" }}>Messages and attachments you share through email or WhatsApp.</li>
            <li style={{ marginBottom: "0.05rem" }}>Brand and project details submitted for sponsorship or partnership evaluation.</li>
            <li style={{ marginBottom: "0.05rem" }}>Billing information only when required for payments or contracts (we do not store payment card details).</li>
          </ul>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4.2 Automatically Collected Data</h3>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>Device information, browser type, and IP address.</li>
            <li style={{ marginBottom: "0.05rem" }}>Pages visited, links clicked, and time spent on our site.</li>
            <li style={{ marginBottom: "0.05rem" }}>Cookie data and pixels used for analytics and marketing through Google Analytics and Meta Pixel.</li>
            <li style={{ marginBottom: "0.05rem" }}>Basic event logs and error reports stored in Neon DB for security and performance analysis.</li>
          </ul>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4.3 Third-Party Integrations</h3>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Our website connects with Google, Meta, Instagram, YouTube, and WhatsApp Business API. Each of these services may collect data under their own privacy policies, which operate independently of ours.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>5. How We Use Your Information</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We process personal data strictly for legitimate business purposes:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>to respond to your inquiries and collaboration requests;</li>
            <li style={{ marginBottom: "0.05rem" }}>to deliver and improve content and digital services;</li>
            <li style={{ marginBottom: "0.05rem" }}>to personalize communication and marketing with your consent;</li>
            <li style={{ marginBottom: "0.05rem" }}>to analyze traffic and optimize site performance;</li>
            <li style={{ marginBottom: "0.05rem" }}>to comply with legal and tax obligations applicable to Dopmaine.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>6. Legal Basis for Processing</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We rely on:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>your consent when you submit forms or subscribe to updates;</li>
            <li style={{ marginBottom: "0.05rem" }}>contractual necessity when collaboration requires data exchange; and</li>
            <li style={{ marginBottom: "0.05rem" }}>legitimate interest for analytics, security, and fraud prevention.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>You may withdraw consent at any time by emailing <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a>.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>7. Cookies and Tracking Tools</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Cookies help us remember preferences and measure performance. You can disable cookies via browser settings. Some site features may not function properly without them.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Meta Pixel and Google Analytics allow us to understand aggregate visitor behavior but do not give us direct access to personal profiles.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>8. Data Storage and Security</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>All data is stored in secure cloud servers and Neon DB with encryption and restricted access. Our infrastructure on GitHub Pages and Render is protected by SSL certificates. Regular audits and password rotations are conducted to minimize risk of unauthorized access.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>9. Data Retention</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>We keep personal information only for as long as it serves the purpose for which it was collected or as required by law. When no longer needed, data is anonymized or securely deleted from our systems.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>10. Sharing and Disclosure</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Bong Bari does not sell or rent personal information. We may share limited data with:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>technical service providers for hosting and analytics;</li>
            <li style={{ marginBottom: "0.05rem" }}>regulatory authorities when legally obligated; and</li>
            <li style={{ marginBottom: "0.05rem" }}>approved partners for joint projects after your explicit consent.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>All vendors operate under data-processing agreements that require confidentiality and security.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>11. WhatsApp and Meta Business Communication</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>When you contact our official WhatsApp Business number (+91 98753 19691), you agree to receive messages about collaborations and updates from Bong Bari. You can opt out at any time by sending "STOP" or by emailing <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a>.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Conversations are stored only for operational and record-keeping purposes and are never shared with unauthorized parties.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>12. International Transfers</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Some data may be processed on servers outside India because of global cloud providers (e.g., Google or Meta). Such transfers are performed under standard contractual safeguards to ensure equivalent protection.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>13. Your Rights</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>You have the right to:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>request access to the data we hold about you;</li>
            <li style={{ marginBottom: "0.05rem" }}>correct inaccuracies or update your information;</li>
            <li style={{ marginBottom: "0.05rem" }}>request deletion where legally permissible; and</li>
            <li style={{ marginBottom: "0.05rem" }}>object to certain forms of processing.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>To exercise these rights, email <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a> or write to Dopmaine, Kolkata, West Bengal. We will respond within 30 days.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>14. Children's Privacy</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Our content is intended for general audiences and not directed to children under 13. We do not knowingly collect data from children. If a guardian believes a minor has provided information, please contact us for immediate removal.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>15. Changes to This Policy</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>We may update this Privacy Policy as our operations or legal obligations change. The latest version will always be available at <a href="https://www.bongbari.com/privacy" style={{ color: "#1565c0", textDecoration: "underline" }}>https://www.bongbari.com/privacy</a>, and the "Last Updated" date will reflect the revision.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>16. Contact Information</h2>
          <div style={{ lineHeight: 1.4, color: "#333" }}>
            <p style={{ marginBottom: "0.05rem" }}><strong>Bong Bari — a Dopmaine brand</strong></p>
            <p style={{ marginBottom: "0.05rem" }}>Registered Entity ID: UDYAM-WB-14-0096694</p>
            <p style={{ marginBottom: "0.05rem" }}>Location: Kolkata, West Bengal, India</p>
            <p style={{ marginBottom: "0.05rem" }}>Email: <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a></p>
            <p style={{ marginBottom: "0.05rem" }}>Phone / WhatsApp: <a href="https://wa.me/919875319691" style={{ color: "#1565c0", textDecoration: "underline" }}>+91 98753 19691</a></p>
            <p>Website: <a href="https://www.bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com</a></p>
          </div>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>17. Acknowledgment</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>By using our website, submitting information, or engaging with our brand digitally, you acknowledge that you have read, understood, and agreed to this Privacy Policy.</p>
        </section>

        </div>

        {/* Fade-out effect at bottom */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30px",
          background: "linear-gradient(transparent, rgba(255,255,255,0.9))",
          pointerEvents: "none",
          borderRadius: "0 0 0.75rem 0.75rem"
        }}></div>

      </div>
      
      <div 
        className="privacy-footer"
        style={{ 
          maxWidth: 900,
          margin: "0 auto 2rem auto", 
          padding: "1rem", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "0.5rem", 
          textAlign: "center", 
          fontSize: "0.85rem", 
          color: "#666",
          lineHeight: 1.4,
          border: "1px solid #e9ecef",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
        <p style={{ margin: "0 0 0.75rem 0", fontWeight: 500, color: "#333" }}>© 2025 Bong Bari | Operated by Dopmaine (UDYAM-WB-14-0096694)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem", marginTop: "0.05rem" }}>
          <a href="/" style={{ color: "#1565c0", textDecoration: "none", padding: "0.25rem", borderRadius: "0.25rem", transition: "background-color 0.2s" }}>Home</a>
          <a href="/privacy" style={{ color: "#1565c0", textDecoration: "none", padding: "0.25rem", borderRadius: "0.25rem", transition: "background-color 0.2s" }}>Privacy Policy</a>
          <a href="/terms" style={{ color: "#1565c0", textDecoration: "none", padding: "0.25rem", borderRadius: "0.25rem", transition: "background-color 0.2s" }}>Terms & Conditions</a>
          <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "none", padding: "0.25rem", borderRadius: "0.25rem", transition: "background-color 0.2s" }}>team@bongbari.com</a>
        </div>
      </div>
    </>
  );
}
