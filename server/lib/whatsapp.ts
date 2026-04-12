/**
 * WhatsApp Cloud API — send OTP via UTILITY template (primary) with text fallback.
 * Phase 35: WhatsApp OTP system.
 *
 * Cascade (UTILITY-first for universal delivery):
 *   1. Try UTILITY templates first — these deliver to ANY number without a session window.
 *      New OTP-style templates (pending approval) are tried first, then generic approved ones.
 *   2. If all templates fail, try a TEXT message — looks like a real OTP but only works
 *      within the 24h customer-service session window (returning users only).
 *   3. If everything fails, return error.
 *
 * Why UTILITY-first?
 *   - AUTH templates are blocked (requires BSP / Business Solution Provider).
 *   - Meta auto-rejects UTILITY templates containing verification/code/OTP language.
 *   - TEXT messages only work within 24h session window — random NEW users won't have one.
 *   - UTILITY templates are the ONLY way to reach cold/new phone numbers reliably.
 *
 * Requires env vars:
 *   META_WABA_TOKEN     — Permanent system-user token
 *   META_WABA_PHONE_ID  — Registered phone number ID
 */
import https from 'https';

const GRAPH_VERSION = 'v22.0';

// Template error codes that mean "template not found / not approved / not available / no permission"
const TEMPLATE_UNAVAILABLE_CODES = new Set([10, 132001, 132015, 131060, 131058]);

interface WaSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
}

/** Low-level helper: POST a JSON body to the Messages API and return parsed result. */
function postMessage(phoneId: string, token: string, payload: object): Promise<WaSendResult> {
  const body = JSON.stringify(payload);
  return new Promise<WaSendResult>((resolve) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/${GRAPH_VERSION}/${phoneId}/messages`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.messages?.[0]?.id) {
              resolve({ ok: true, messageId: json.messages[0].id });
            } else {
              const err = json.error;
              resolve({
                ok: false,
                error: err?.error_user_msg || err?.message || 'Unknown API error',
                errorCode: err?.code,
              });
            }
          } catch {
            resolve({ ok: false, error: 'Invalid response from WhatsApp API' });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(body);
    req.end();
  });
}

/**
 * Send an OTP to a WhatsApp number.
 *
 * Cascade (UTILITY-first for universal delivery):
 *   1. UTILITY templates — works for ANY number, no session needed.
 *      New OTP-worded templates tried first, then generic approved ones.
 *   2. TEXT message last resort — nice format but needs 24h session window.
 *
 * @param to  — Recipient in E.164 (no +), e.g. "918777849865"
 * @param otp — The 6-digit code (plaintext — Meta delivers it to the user)
 */
export async function sendWhatsAppOtp(to: string, otp: string): Promise<WaSendResult> {
  const token = process.env.META_WABA_TOKEN;
  const phoneId = process.env.META_WABA_PHONE_ID;

  if (!token || !phoneId) {
    console.error('[WhatsApp] Missing META_WABA_TOKEN or META_WABA_PHONE_ID in env');
    return { ok: false, error: 'WhatsApp not configured on server' };
  }

  // ── Attempt 1: UTILITY templates (work for ALL numbers without session) ──
  // These 4 templates are APPROVED by Meta and work universally.
  // Dead templates (bong_ngl_confirm_v1, bong_ngl_number_v1) removed — rejected by Meta.
  const utilityTemplates = [
    'bong_order_reference_v1',
    'bong_appointment_remind_v1',
    'bong_status_update_v1',
    'bong_ticket_update_v1',
  ];

  for (const tplName of utilityTemplates) {
    const utilPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: tplName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    };

    const utilResult = await postMessage(phoneId, token, utilPayload);

    if (utilResult.ok) {
      console.log(`[WhatsApp] OTP sent via UTILITY template "${tplName}" →`, to, 'msgId:', utilResult.messageId);
      return utilResult;
    }

    // If this template is unavailable/rejected/pending, try the next one
    if (utilResult.errorCode && TEMPLATE_UNAVAILABLE_CODES.has(utilResult.errorCode)) {
      console.log(`[WhatsApp] Template "${tplName}" unavailable (code ${utilResult.errorCode}), trying next...`);
      continue;
    }

    // Non-template error (rate limit, invalid number, etc.) — stop trying templates
    console.log(`[WhatsApp] Template "${tplName}" failed with non-template error (code ${utilResult.errorCode}):`, utilResult.error);
    break;
  }

  // ── Attempt 2: TEXT message (last resort — only works with 24h session window) ──
  // Professional OTP format. Will only deliver if user messaged the business number recently.
  console.log('[WhatsApp] All UTILITY templates failed — trying TEXT message (needs session)...');

  const textPayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: `🔐 Your Bong NGL verification code is: *${otp}*\n\nThis code expires in 5 minutes.\nDo not share it with anyone.`,
    },
  };

  const textResult = await postMessage(phoneId, token, textPayload);

  if (textResult.ok) {
    console.log('[WhatsApp] OTP sent via TEXT (session window) →', to, 'msgId:', textResult.messageId);
    return textResult;
  }

  // ── All attempts failed ──
  console.error('[WhatsApp] All delivery methods failed for', to);
  return {
    ok: false,
    error: 'Could not deliver OTP. Please try again in a moment.',
  };
}

/**
 * Send a plain text message (for dev/testing or direct messaging).
 * Uses a 24h session window — only works if user messaged your number first.
 */
export async function sendWhatsAppText(to: string, text: string): Promise<WaSendResult> {
  const token = process.env.META_WABA_TOKEN;
  const phoneId = process.env.META_WABA_PHONE_ID;

  if (!token || !phoneId) {
    return { ok: false, error: 'WhatsApp not configured on server' };
  }

  return postMessage(phoneId, token, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
}

/**
 * DEV ONLY — Simulate OTP send by logging to console.
 * Used when META_WABA_TOKEN is not set (local dev without WhatsApp).
 */
export function devLogOtp(to: string, otp: string): WaSendResult {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  [DEV] OTP for ${to}: ${otp}`);
  console.log(`  (Would send via WhatsApp in production)`);
  console.log(`${'='.repeat(50)}\n`);
  return { ok: true, messageId: 'dev-' + Date.now() };
}
