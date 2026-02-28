# AI Agent Handover Instructions: Stitch Integration

**ATTENTION NEXT AI AGENT:** Please read this before modifying the UI.

This project uses **Google Stitch** for UI generation and the **Stitch MCP Server** for pulling designs into code.

## 1. System Capabilities
*   **Stitch MCP Server**: Connected globally. You can query Stitch projects if the user provides an ID.
*   **Agent Skills Installed**:
    *   `react:components` (global): Use this to convert Stitch UI screens into React component systems within this `client/src` directory.
    *   `enhance-prompt` (global): Use this to help the user craft highly specific prompts for Stitch when they ask for a new design.

## 2. The Development Protocol
We do **not** write raw CSS or blind Tailwind utility classes for major layout revamps anymore. 
If the user requests a significant UI change:
1.  **Do not code it immediately.**
2.  Use the `enhance-prompt` skill to generate a prompt describing the requested UI.
3.  Ask the user to paste that prompt into Google Stitch and approve the visual design.
4.  Ask for the Stitch Project ID.
5.  Use the Stitch MCP server to pull the code down and integrate it.

## 3. Strict Project Rules for Integration
When integrating the pulled code from Stitch:
*   **Fluid Mathematical Grids only**: No hardcoded media queries like `@media (max-width: 768px)` or hardcoded Tailwind breakpoints unless absolutely necessary. We rely on intrinsic sizing (`minmax(110px, 1fr)`).
*   **Mobile First**: Ensure the layout does not break the `MobileNavBar` (`pt-safe`, `pb-safe`).
*   **Theming**: We use the "Cyber-Bong 2077" aesthetic (black/dark zinc background, glassmorphism `backdrop-blur`, glowing text).

## 4. Global Skills Context
The skills (`react-components`, `enhance-prompt`) were installed globally (`--global`) on this user's machine. They are available regardless of what directory this project is opened in. Do not ask the user to reinstall them.
