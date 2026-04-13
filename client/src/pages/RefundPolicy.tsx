import React from "react";

const LAST_UPDATED = "April 2026";

export default function RefundPolicy() {
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
        className="refund-container"
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
        <title>Refund &amp; Cancellation Policy — Bong Bari</title>
        <meta name="description" content="Refund, cancellation and return policy for Bong Bari digital services under Dopmaine (UDYAM-WB-14-0096694)." />
        <link rel="canonical" href="https://www.bongbari.com/refund" />

        {/* Fixed Header */}
        <div
          className="refund-header"
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "1.5rem 2rem 1rem 2rem",
            zIndex: 10
          }}>
          <h1 className="refund-title" style={{ fontSize: "2.25rem", fontWeight: 700, textAlign: "center", color: "#1a237e", margin: 0 }}>Refund &amp; Cancellation Policy</h1>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", marginTop: "0.05rem" }}>Last Updated: {LAST_UPDATED}</div>
        </div>

        {/* Scrollable Content */}
        <div
          className="custom-scrollbar refund-content"
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
            
            @media (max-width: 768px) {
              .refund-container {
                margin: 1rem !important;
                max-width: calc(100vw - 2rem) !important;
              }
              .refund-header {
                padding: 1rem 1rem 0.75rem 1rem !important;
              }
              .refund-content {
                padding: 1rem 1rem 1.5rem 1rem !important;
                max-height: 70vh !important;
              }
              .refund-title {
                font-size: 1.75rem !important;
              }
            }
          `}</style>

          {/* ── Section 1 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "0.5rem" }}>1. Introduction</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            This Refund &amp; Cancellation Policy applies to all paid services, digital products, subscriptions, and transactions offered through <strong>Bong Bari</strong> (www.bongbari.com), operated by <strong>Dopmaine</strong> (UDYAM Registration: WB-14-0096694), with its registered office in Kolkata, West Bengal, India.
          </p>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" }}>
            By making a purchase or payment on our platform, you acknowledge that you have read, understood, and agree to this policy. This policy complies with the Consumer Protection Act, 2019, the Information Technology Act, 2000, and applicable RBI guidelines for digital payments.
          </p>

          {/* ── Section 2 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>2. Nature of Services</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Bong Bari provides <strong>digital services and content</strong>, including but not limited to:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>AI-powered online tools (text humanizer, voice synthesis, media tools)</li>
            <li>Premium features and subscriptions</li>
            <li>Digital content creation and entertainment services</li>
            <li>Anonymous messaging platform features (NGL)</li>
            <li>Creator support contributions (tips, donations)</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" }}>
            As digital services are <strong>delivered instantly upon purchase</strong> and cannot be "returned" like physical goods, this policy reflects the non-reversible nature of digital delivery.
          </p>

          {/* ── Section 3 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>3. General Refund Policy</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            <strong>All digital purchases are final and non-refundable</strong> once the service has been accessed, activated, or delivered to your account. This includes:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>One-time purchases of digital tools or features</li>
            <li>Subscription payments after the service period has begun</li>
            <li>Creator tips, donations, and voluntary contributions</li>
            <li>Any service that has been partially or fully consumed</li>
          </ul>

          {/* ── Section 4 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>4. Eligible Refund Scenarios</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            We will process a refund <strong>only</strong> in the following cases:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li><strong>Duplicate payment:</strong> You were charged more than once for the same service due to a technical error.</li>
            <li><strong>Unauthorized transaction:</strong> A payment was made from your account without your authorization (subject to verification).</li>
            <li><strong>Service not delivered:</strong> The paid service was never activated or made available in your account within 24 hours of payment, despite a successful transaction.</li>
            <li><strong>Technical failure:</strong> A confirmed server-side defect prevented you from accessing a paid feature during its entire validity period, and we were unable to resolve it.</li>
          </ul>

          {/* ── Section 5 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>5. Non-Refundable Situations</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Refunds will <strong>not</strong> be issued for:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>Change of mind or buyer's remorse after purchase</li>
            <li>Services that have been accessed, used, or partially consumed</li>
            <li>Dissatisfaction with AI-generated outputs (as results vary by input)</li>
            <li>Failure to use the service before its expiry or validity period</li>
            <li>Account suspension or termination due to policy violations</li>
            <li>Issues caused by your device, browser, internet connection, or third-party software</li>
            <li>Voluntary tips, donations, or creator support payments</li>
            <li>Promotional, discounted, or free-trial conversions</li>
          </ul>

          {/* ── Section 6 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>6. Subscription Cancellation</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            If we offer subscription-based services:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>You may cancel your subscription at any time from your account settings.</li>
            <li>Cancellation takes effect at the <strong>end of the current billing cycle</strong>. You retain access until then.</li>
            <li><strong>No pro-rata refunds</strong> will be provided for the remaining days of a billing period after cancellation.</li>
            <li>If cancelled within <strong>48 hours</strong> of the first-ever subscription purchase and no premium features have been used, a full refund may be issued at our discretion.</li>
          </ul>

          {/* ── Section 7 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>7. How to Request a Refund</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            To request a refund for an eligible scenario, email us at:
          </p>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" }}>
            <strong>📧 Email:</strong> <a href="mailto:bongbari@gmail.com" style={{ color: "#2563eb" }}>bongbari@gmail.com</a>
          </p>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" }}>
            Your refund request <strong>must</strong> include:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>Full name and registered email address</li>
            <li>Transaction ID or payment reference number</li>
            <li>Date and amount of the transaction</li>
            <li>Reason for refund request with supporting evidence (screenshots, error logs)</li>
            <li>Payment method used</li>
          </ul>

          {/* ── Section 8 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>8. Refund Request Deadline</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            All refund requests must be submitted within <strong>7 (seven) calendar days</strong> from the date of the transaction. Requests received after this period will not be entertained, regardless of the reason.
          </p>

          {/* ── Section 9 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>9. Refund Processing</h2>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem", marginTop: "0.25rem" }}>
            <li>Eligible refund requests will be reviewed within <strong>3–5 business days</strong>.</li>
            <li>If approved, the refund will be credited to the <strong>original payment method</strong> within <strong>7–10 business days</strong> from approval.</li>
            <li>Bank processing times may vary. We are not responsible for delays by your bank or payment provider.</li>
            <li>Refund amounts will be in <strong>Indian Rupees (INR)</strong> at the original transaction value. No interest is payable on refunds.</li>
          </ul>

          {/* ── Section 10 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>10. Chargebacks &amp; Disputes</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            If you initiate a chargeback or payment dispute with your bank or card issuer <strong>without first contacting us</strong>, we reserve the right to:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>Suspend your account and all associated services immediately</li>
            <li>Contest the chargeback with transaction evidence</li>
            <li>Recover any additional fees or penalties incurred due to the dispute</li>
            <li>Deny future refund requests from the same account</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" }}>
            We strongly encourage you to contact us directly at <a href="mailto:bongbari@gmail.com" style={{ color: "#2563eb" }}>bongbari@gmail.com</a> before raising a chargeback.
          </p>

          {/* ── Section 11 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>11. Free Services</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Many of Bong Bari's tools and features are provided <strong>free of charge</strong>. No refund claims apply to free services, promotional credits, bonus features, or trial access.
          </p>

          {/* ── Section 12 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>12. Modification of Services</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            We reserve the right to modify, discontinue, or update any service at any time. If a paid service is permanently discontinued before your subscription period ends, we will issue a pro-rata refund for the unused portion. Temporary maintenance or downtime does not qualify for refunds.
          </p>

          {/* ── Section 13 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>13. Fraud Prevention</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            We monitor all transactions and refund requests for patterns of abuse or fraud. Fraudulent refund claims, including but not limited to false chargeback claims, use of stolen payment credentials, or repeated refund exploitation, may result in:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li>Permanent account termination</li>
            <li>Reporting to law enforcement and relevant authorities</li>
            <li>Legal proceedings to recover losses</li>
          </ul>

          {/* ── Section 14 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>14. Governing Law &amp; Jurisdiction</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            This policy is governed by and construed in accordance with the laws of India. Any disputes arising from this policy shall be subject to the <strong>exclusive jurisdiction of the courts in Kolkata, West Bengal, India</strong>.
          </p>

          {/* ── Section 15 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>15. Changes to This Policy</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            We may update this Refund &amp; Cancellation Policy at any time. Changes take effect immediately upon posting on this page. The "Last Updated" date at the top reflects the latest revision. Continued use of our paid services after changes constitutes acceptance of the updated policy.
          </p>

          {/* ── Section 16 ── */}
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a237e", marginTop: "1.25rem" }}>16. Contact Us</h2>
          <p style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", marginTop: "0.25rem" }}>
            For refund requests, billing questions, or any payment-related concerns:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.65, fontSize: "0.95rem", paddingLeft: "1.5rem" }}>
            <li><strong>Business Name:</strong> Dopmaine</li>
            <li><strong>Proprietor:</strong> Abhijit Pramanik</li>
            <li><strong>UDYAM Registration:</strong> WB-14-0096694</li>
            <li><strong>Email:</strong> <a href="mailto:bongbari@gmail.com" style={{ color: "#2563eb" }}>bongbari@gmail.com</a></li>
            <li><strong>Website:</strong> <a href="https://www.bongbari.com" style={{ color: "#2563eb" }}>www.bongbari.com</a></li>
            <li><strong>Address:</strong> 222, Laxmi Narayan Rd, Vivekanand Pally, Dum Dum Cantonment, Kolkata 700065, West Bengal, India</li>
          </ul>

          {/* Bottom spacer */}
          <div style={{ height: "1.5rem" }} />
        </div>
      </div>

      {/* Footer */}
      <div
        className="refund-footer"
        style={{
          maxWidth: 900,
          margin: "0 auto 2rem auto",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#6b7280",
          padding: "0 1rem"
        }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>← Back to Home</a>
        {" · "}
        <a href="/privacy" style={{ color: "#2563eb", textDecoration: "none" }}>Privacy Policy</a>
        {" · "}
        <a href="/terms" style={{ color: "#2563eb", textDecoration: "none" }}>Terms &amp; Conditions</a>
        <div style={{ marginTop: "0.5rem" }}>© {new Date().getFullYear()} Dopmaine (Bong Bari) | Proprietor: Abhijit Pramanik. All rights reserved.</div>
      </div>
    </>
  );
}
