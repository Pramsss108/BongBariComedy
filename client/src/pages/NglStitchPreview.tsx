/**
 * NglStitchPreview — Direct import of Stitch HTML.
 * Loads the raw Stitch-generated HTML (dashboard-gen3.html) via iframe.
 * No recreation, no image — pure Stitch code import.
 * Route: /ngl/stitch-preview
 */
export default function NglStitchPreview() {
  return (
    <iframe
      src="/stitch-preview.html"
      title="Stitch Design Preview"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        margin: 0,
        padding: 0,
      }}
    />
  );
}
