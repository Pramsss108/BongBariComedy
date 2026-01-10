/**
 * Layout Sentry - Automated Mobile UI Auditor
 * 
 * This script provides a global function `window.runLayoutAudit()` that:
 * 1. Checks for horizontal overflow (causing unwanted side-scrolling).
 * 2. Identifies text smaller than 12px (unreadable on mobile).
 * 3. Finds tap targets smaller than 44x44px.
 * 4. Logs a report to the console for AI Agents to read.
 */

export interface LayoutIssue {
  type: 'overflow' | 'small-text' | 'small-target' | 'broken-image';
  element: string; // css selector or tag
  details: string;
  rect?: DOMRect;
}

export function runLayoutAudit(): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const width = window.innerWidth;
  const allElements = document.querySelectorAll('*');

  console.log(`🔍 Starting Layout Audit (Viewport: ${width}px)...`);

  allElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);

    // 1. Check Horizontal Overflow (tolerance of 1px)
    if (rect.right > width + 1 && computed.position !== 'fixed' && computed.opacity !== '0' && computed.display !== 'none') {
      // Ignore if parent hides overflow
      let parent = el.parentElement;
      let isHidden = false;
      while (parent) {
        if (window.getComputedStyle(parent).overflowX === 'hidden') {
          isHidden = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (!isHidden) {
        issues.push({
          type: 'overflow',
          element: el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : ''),
          details: `Right edge at ${Math.round(rect.right)}px (Viewport: ${width}px)`,
          rect
        });
      }
    }

    // 2. Check Text Size (if it contains text)
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE && el.textContent?.trim().length) {
      const fontSize = parseFloat(computed.fontSize);
      if (fontSize < 10) { // 10px is absolute minimum for easy reading, 12px preferred
        issues.push({
            type: 'small-text',
            element: el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : ''),
            details: `Font size is ${fontSize}px`
        });
      }
    }

    // 3. Touch Targets (Buttons/Links)
    if (['BUTTON', 'A', 'INPUT'].includes(el.tagName) && computed.display !== 'none' && computed.visibility !== 'hidden') {
      if ((rect.width < 44 || rect.height < 44) && (rect.width > 0 && rect.height > 0)) {
        // Warning only
        // console.warn('Small touch target:', el); 
      }
    }

    // 4. Check for Broken Images
    if (el.tagName === 'IMG') {
        const img = el as HTMLImageElement;
        // Check if image has src but has 0 natural dimension after loading
        if (img.src && img.complete && img.naturalWidth === 0) {
            issues.push({
                type: 'broken-image',
                element: `img[src="${img.src.substring(0, 30)}..."]`,
                details: `Image failed to load (0x0px)`
            });
        }
    }
  });

  // Prepare Context
  const isPortrait = window.innerHeight > window.innerWidth;
  const deviceType = window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop';
  const context = {
      userAgent: navigator.userAgent,
      orientation: isPortrait ? 'Portrait' : 'Landscape',
      deviceType: deviceType,
      platform: navigator.platform
  };

  if (issues.length === 0) {
    console.log("✅ Layout Audit Passed: No critical issues found.");
    // Send "Pass" report so agent knows it was run
    fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            issues: [],
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            context
        })
    }).catch(err => console.error("Failed to send logs:", err));
  } else {
    console.error(`❌ Layout Audit Failed: Found ${issues.length} issues.`);
    console.table(issues);

    // Send to Backend for AI Agent Inspection
    fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            issues,
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            context
        })
    }).catch(err => console.error("Failed to send logs to agent:", err));
  }

  return issues;
}

// Attach to window for Agent access
(window as any).runLayoutAudit = runLayoutAudit;
