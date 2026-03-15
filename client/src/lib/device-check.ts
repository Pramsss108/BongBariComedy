/**
 * Checks if the user's device has sufficient hardware to run local AI models (like Kokoro 82M or Whisper).
 * 
 * V13 Rules:
 * - Needs >= 4GB RAM
 * - Needs >= 4 CPU Cores
 * - Bypassed for testing if URL has ?forceAILoad=1
 */
export function isDeviceAIElligible(): boolean {
    // Developer override
    if (typeof window !== 'undefined' && window.location.search.includes('forceAILoad=1')) {
        return true;
    }

    try {
        // 1. Check RAM (navigator.deviceMemory is supported in Chromium)
        const ram = (navigator as any).deviceMemory || 4; // Assume 4GB if API not available (Safari/Firefox)
        if (ram < 4) {
            console.warn(`[Hardware Check] Device has insufficient RAM (${ram}GB). 4GB required.`);
            return false;
        }

        // 2. Check CPU Cores
        const cores = navigator.hardwareConcurrency || 4;
        if (cores < 4) {
            console.warn(`[Hardware Check] Device has insufficient CPU cores (${cores}). 4 cores required.`);
            return false;
        }

        // 3. WebGPU/WASM validation (Optional advanced check)
        // For now, RAM and CPU are the primary crash indicators for Kokoro 82M.

        return true;
    } catch (error) {
        console.error("[Hardware Check] Error validating hardware:", error);
        // Be conservative: if we can't check, assume it might fail, but let them try unless we have proof they are weak.
        // Actually, returning true here lets desktop Safari/Firefox users through since they don't have deviceMemory.
        return true;
    }
}


/**
 * Phase 20: Auto-Director Fallback System
 * Profiles hardware to determine how heavy our audio physics math can be.
 */
export function getHardwareProfile(): 'potato' | 'standard' | 'beast' {
    if (typeof window === 'undefined') return 'standard';
    const ram = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    if (ram <= 4 || cores <= 4) return 'potato';
    if (ram >= 8 && cores >= 8) return 'beast';
    return 'standard';
}
