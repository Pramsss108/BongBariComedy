// Global, invisible audio unlock helper to comply with browser autoplay policies
// - Creates a shared AudioContext (suspended by default) and resumes it on first user gesture
// - Dispatches a window event 'audio-unlocked' when unlocked

let audioCtx: (AudioContext | null) = null;
let isUnlocked = false;
let listenersAttached = false;
let visibilityHandlersAttached = false;
const gestureEvents = [
	'pointerdown',
	'touchstart',
	'click',
	'keydown',
];

export function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (audioCtx) return audioCtx;
	try {
		const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
		if (!Ctx) return null;
		audioCtx = new Ctx();
		attachVisibilityHandlers();
	} catch (_e) {
		audioCtx = null;
	}
	return audioCtx;
}

function dispatchUnlocked() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event('audio-unlocked'));
	}
}

async function tryResume() {
	const ctx = getAudioContext();
	if (!ctx) {
		isUnlocked = true; // No WebAudio available, nothing to unlock
		dispatchUnlocked();
		return true;
	}
	try {
		if (ctx.state === 'suspended') {
			await ctx.resume();
		}
		// Play a tiny silent buffer to fully initialize on some browsers
		const buffer = ctx.createBuffer(1, 1, 22050);
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		source.start(0);
		source.stop(0);
		isUnlocked = true;
		dispatchUnlocked();
		return true;
	} catch (_e) {
		return false;
	}
}

function onFirstGesture() {
	tryResume().finally(() => {
			if (typeof window !== 'undefined') {
				const opts: AddEventListenerOptions | boolean = { passive: true } as any;
				gestureEvents.forEach((ev) => window.removeEventListener(ev as any, onFirstGesture as any, opts as any));
			listenersAttached = false;
		}
	});
}

export function ensureAudioUnlocked() {
	if (typeof window === 'undefined' || isUnlocked || listenersAttached) return;
	// Attach a few common gestures that count as a user interaction across browsers
	const opts: AddEventListenerOptions = { passive: true };
  gestureEvents.forEach((ev) => window.addEventListener(ev as any, onFirstGesture as any, opts));
	listenersAttached = true;
	attachVisibilityHandlers();
}

export function onAudioUnlocked(cb: () => void) {
	if (isUnlocked) {
		cb();
		return () => {};
	}
	const handler = () => cb();
	window.addEventListener('audio-unlocked', handler, { passive: true } as any);
	return () => window.removeEventListener('audio-unlocked', handler as any);
}

export function isAudioUnlocked() {
	return isUnlocked;
}

// Try to resume immediately; useful to call right before playing a sound on a user event
export async function resumeAudioNow(): Promise<boolean> {
	return await tryResume();
}

// Explicitly suspend the shared AudioContext if running (used on tab hide/blur)
export async function suspendAudioNow(): Promise<void> {
	const ctx = getAudioContext();
	if (!ctx) return;
	try {
		if (ctx.state === 'running') {
			await ctx.suspend();
		}
	} catch (_e) {
		// ignore
	}
}

function attachVisibilityHandlers() {
	if (typeof document === 'undefined' || visibilityHandlersAttached) return;
	visibilityHandlersAttached = true;
	const onHide = () => {
		// Suspend audio on hide to stop any ongoing sounds immediately
		suspendAudioNow();
	};
	const onShow = () => {
		// Only try to resume if previously unlocked
		if (isUnlocked) {
			// Best-effort resume; browsers may allow since it was previously user-gestured
			resumeAudioNow().catch(() => {});
		}
	};
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') onHide();
		else onShow();
	}, { passive: true } as any);
	// Also guard window focus/blur
	window.addEventListener('blur', onHide, { passive: true } as any);
	window.addEventListener('focus', onShow, { passive: true } as any);
}
