/**
 * NglStitchPreview — Pixel-perfect import of the Stitch design.
 * Project: 12494298028177117085
 * Screen:  Bong Bari Premium Home Dashboard V1 (97ffb1fc58864c3fa5b569c3792befcc)
 *
 * This is a STANDALONE preview page. No buttons, no logic, no API calls.
 * It exists only to display the Stitch design exactly as-is for review.
 * Route: /ngl/stitch-preview
 */
export default function NglStitchPreview() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background:
          'radial-gradient(ellipse at top, #1a1a24 0%, #0a0a10 40%, #050508 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '24px 12px 48px',
        fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          color: 'rgba(212,165,116,0.6)',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 16,
          fontWeight: 600,
        }}
      >
        Stitch Design Preview · Bong Bari Premium V1
      </div>

      <img
        src="/stitch/bong-bari-premium-v1.png"
        alt="Bong Bari Premium Home Dashboard V1 — Stitch design"
        style={{
          width: '100%',
          maxWidth: 1376,
          height: 'auto',
          display: 'block',
          borderRadius: 16,
          boxShadow:
            '0 30px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(212,165,116,0.2)',
        }}
        draggable={false}
      />

      <div
        style={{
          marginTop: 20,
          color: 'rgba(245,240,230,0.4)',
          fontSize: 12,
          textAlign: 'center',
          maxWidth: 600,
          lineHeight: 1.6,
        }}
      >
        Frontend-only preview · Imported from Stitch project{' '}
        <code style={{ color: 'rgba(212,165,116,0.7)' }}>
          12494298028177117085
        </code>{' '}
        · screen{' '}
        <code style={{ color: 'rgba(212,165,116,0.7)' }}>
          97ffb1fc58864c3fa5b569c3792befcc
        </code>
      </div>
    </div>
  );
}
