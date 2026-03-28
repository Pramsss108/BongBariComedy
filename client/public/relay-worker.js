/**
 * BongBari Relay Worker (SharedWorker)
 * ─────────────────────────────────────────────────────────────
 * Runs in a single background thread shared across all BongBari
 * tabs. Joins the WebRTC relay mesh for download offloading.
 *
 * This is a STUB — full PeerJS mesh integration done in Phase 2
 * (after consent UX is validated in production).
 */

/* eslint-disable no-restricted-globals */
const ports = new Set();
let relayActive = false;

self.onconnect = (e) => {
  const port = e.ports[0];
  ports.add(port);

  port.onmessage = (msg) => {
    if (msg.data?.cmd === 'start' && !relayActive) {
      relayActive = true;
      broadcast({ type: 'relay_started' });
      // Phase 2: initiate PeerJS connection here
    }
    if (msg.data?.cmd === 'stop') {
      relayActive = false;
      broadcast({ type: 'relay_stopped' });
      // Phase 2: close PeerJS connection here
    }
  };

  port.start();
};

function broadcast(msg) {
  ports.forEach(p => { try { p.postMessage(msg); } catch {} });
}
