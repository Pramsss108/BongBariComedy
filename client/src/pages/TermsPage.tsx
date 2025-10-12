import React from "react";

const LAST_UPDATED = "October 13, 2025";

export default function TermsPage() {
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
        className="terms-container"
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
        <title>Terms and Conditions — Bong Bari</title>
        <meta name="description" content="Terms for using Bong Bari website and content under Dopmaine (UDYAM-WB-14-0096694)." />
        <link rel="canonical" href="https://www.bongbari.com/terms" />

        {/* Fixed Header */}
        <div 
          className="terms-header"
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "1.5rem 2rem 1rem 2rem",
            zIndex: 10
          }}>
          <h1 className="terms-title" style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "0.05rem", textAlign: "center", color: "#1a237e", margin: 0 }}>Terms and Conditions — Bong Bari</h1>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", marginTop: "0.05rem" }}>Last Updated: October 2025</div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="custom-scrollbar terms-content"
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
            .terms-container {
              margin: 1rem !important;
              max-width: calc(100vw - 2rem) !important;
            }
            .terms-header {
              padding: 1rem 1rem 0.75rem 1rem !important;
            }
            .terms-content {
              padding: 1rem 1rem 1.5rem 1rem !important;
              max-height: 70vh !important;
            }
            .terms-title {
              font-size: 1.75rem !important;
            }
            .terms-footer {
              margin: 0 1rem 2rem 1rem !important;
              max-width: calc(100vw - 2rem) !important;
            }
          }
          
          @media (max-width: 480px) {
            .terms-content {
              max-height: 65vh !important;
            }
            .terms-title {
              font-size: 1.5rem !important;
            }
          }
        `}</style>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>About These Terms and Conditions</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>These Terms and Conditions ("Terms") govern your use of the website <a href="https://www.bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com</a>, and all related digital platforms operated under the brand Bong Bari, a creative and entertainment initiative by Dopmaine (UDYAM-WB-14-0096694), based in Kolkata, West Bengal, India.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>By accessing, browsing, or engaging with our site, social media, or services, you agree to these Terms. If you do not agree, please discontinue using our platforms immediately.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>1. Legal Identity</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Bong Bari operates as a creative content and production brand under Dopmaine, a registered Indian company engaged in digital services, content production, and marketing collaborations.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>All references to "we," "our," or "us" in these Terms refer to Bong Bari and Dopmaine collectively.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>2. Eligibility</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>To access or use our site, you must be at least 18 years old or have parental consent if you are a minor. By continuing to use our site, you confirm that all information you provide is accurate, current, and truthful.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>3. Scope of Services</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Bong Bari provides entertainment videos, digital content, production services, and collaboration opportunities.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We reserve the right to modify, expand, or discontinue any service at any time without prior notice.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Some features may require you to provide personal information or sign collaboration agreements separately.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4. Intellectual Property Rights</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>All content, including videos, text, images, scripts, audio, and design elements available on Bong Bari's platforms, are the intellectual property of Dopmaine or its respective content creators, unless otherwise stated.</p>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4.1 Restrictions</h3>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>You may not:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>reproduce, distribute, modify, or publicly display any part of our content without prior written consent;</li>
            <li style={{ marginBottom: "0.05rem" }}>use our name, logo, or content for promotional, commercial, or defamatory purposes;</li>
            <li style={{ marginBottom: "0.05rem" }}>embed or mirror our content on external websites or social media without permission.</li>
          </ul>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2", marginBottom: "0.05rem", marginTop: "0.05rem" }}>4.2 Limited Use</h3>
          <p style={{ lineHeight: 1.4, color: "#333" }}>You may view and share Bong Bari's content on social platforms only through the official sharing features provided by those platforms and without altering the content's context, watermark, or credits.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>5. User-Submitted Content</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>If you submit a story, script, idea, collaboration proposal, or media material through our website or email (<a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a>), you agree that:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>your submission is voluntary and non-confidential;</li>
            <li style={{ marginBottom: "0.05rem" }}>you grant Bong Bari and Dopmaine a non-exclusive, royalty-free, worldwide right to use, adapt, or publish the material;</li>
            <li style={{ marginBottom: "0.05rem" }}>you represent that you own or have rights to all submitted materials; and</li>
            <li style={{ marginBottom: "0.05rem" }}>you waive any claims to future compensation unless a formal contract is signed.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>We may reject, edit, or remove user submissions at our discretion.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>6. Collaborations and Brand Deals</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Any brand, company, or agency entering into a collaboration or sponsorship with Bong Bari must sign a separate agreement detailing deliverables, timelines, and payment terms.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Verbal discussions or email exchanges alone do not constitute a binding agreement.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>All payments and deliverables are managed through Dopmaine, which acts as the legal contracting entity.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>7. Content Accuracy and Disclaimer</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>While we strive to maintain accurate and up-to-date information, Bong Bari's website and videos may occasionally contain typographical, factual, or contextual errors.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>All content is provided for entertainment and informational purposes only.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We do not guarantee:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>uninterrupted or error-free operation of our website;</li>
            <li style={{ marginBottom: "0.05rem" }}>completeness or accuracy of any third-party information linked from our platforms;</li>
            <li style={{ marginBottom: "0.05rem" }}>specific results from using our content or services.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>8. Limitation of Liability</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>To the fullest extent permitted by law, Bong Bari and Dopmaine are not liable for:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>any direct, indirect, incidental, or consequential damages resulting from your use or inability to use our site or content;</li>
            <li style={{ marginBottom: "0.05rem" }}>losses caused by unauthorized access, data breaches, or third-party actions beyond our control;</li>
            <li style={{ marginBottom: "0.05rem" }}>content posted by users or third-party integrations (including Meta, YouTube, or WhatsApp).</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>If you are dissatisfied with our services or content, your sole remedy is to stop using the Bong Bari platforms.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>9. Third-Party Links and Integrations</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Our website may include links to other websites, or embedded media from platforms such as YouTube or Instagram.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We are not responsible for the content, policies, or practices of any external websites or applications.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Visiting such sites is at your own discretion and subject to their respective terms of service.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>10. Privacy and Data Protection</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>Your use of our website is also governed by our Privacy Policy, which explains how we collect, use, and store your data.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>By agreeing to these Terms, you also consent to the Privacy Policy available at <a href="/privacy" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com/privacy</a>.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>11. Suspension or Termination of Access</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We reserve the right to suspend or terminate access to our website or any part of it at any time if:</p>
          <ul style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem", paddingLeft: "2rem", listStyleType: "disc", listStylePosition: "outside" }}>
            <li style={{ marginBottom: "0.05rem" }}>you violate these Terms;</li>
            <li style={{ marginBottom: "0.05rem" }}>you engage in fraudulent or harmful activities; or</li>
            <li style={{ marginBottom: "0.05rem" }}>we believe your actions may harm Bong Bari, Dopmaine, or other users.</li>
          </ul>
          <p style={{ lineHeight: 1.4, color: "#333" }}>In such cases, we are not obligated to provide advance notice or compensation.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>12. Changes to These Terms</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>We may modify these Terms periodically to reflect changes in operations, laws, or business needs.</p>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>The most current version will always be posted at <a href="/terms" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com/terms</a> with the updated date.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Your continued use of the website after any modifications signifies your acceptance of the new Terms.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>13. Governing Law and Jurisdiction</h2>
          <p style={{ lineHeight: 1.4, color: "#333", marginBottom: "0.05rem" }}>These Terms are governed by the laws of India.</p>
          <p style={{ lineHeight: 1.4, color: "#333" }}>Any disputes arising from or related to Bong Bari or Dopmaine's operations shall fall under the exclusive jurisdiction of the courts located in Kolkata, West Bengal.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>14. Indemnification</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>You agree to indemnify and hold harmless Bong Bari, Dopmaine, and their directors, employees, or affiliates from any claims, losses, damages, or expenses resulting from your violation of these Terms or misuse of our website and services.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>15. Severability</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall remain in full effect and enforceable under applicable law.</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>16. Contact Information</h2>
          <div style={{ lineHeight: 1.4, color: "#333" }}>
            <p style={{ marginBottom: "0.05rem" }}><strong>Bong Bari — Operated by Dopmaine</strong></p>
            <p style={{ marginBottom: "0.05rem" }}>UDYAM Registration: UDYAM-WB-14-0096694</p>
            <p style={{ marginBottom: "0.05rem" }}>Email: <a href="mailto:team@bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>team@bongbari.com</a></p>
            <p style={{ marginBottom: "0.05rem" }}>Phone / WhatsApp: <a href="https://wa.me/919875319691" style={{ color: "#1565c0", textDecoration: "underline" }}>+91 98753 19691</a></p>
            <p style={{ marginBottom: "0.05rem" }}>Website: <a href="https://www.bongbari.com" style={{ color: "#1565c0", textDecoration: "underline" }}>www.bongbari.com</a></p>
            <p>Address: Kolkata, West Bengal, India</p>
          </div>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>17. Entire Agreement</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>These Terms constitute the entire understanding between you and Bong Bari regarding the use of our website and services. They supersede all prior communications, proposals, or understandings (whether oral or written).</p>
        </section>

        <section style={{ marginBottom: "0.05rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#1565c0", marginBottom: "0.05rem", marginTop: "0.05rem" }}>18. Acceptance</h2>
          <p style={{ lineHeight: 1.4, color: "#333" }}>By continuing to browse our site, engage with our content, or contact us through any platform, you confirm that you have read, understood, and agreed to abide by these Terms and Conditions.</p>
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
        className="terms-footer"
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
