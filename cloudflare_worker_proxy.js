export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // If no URL is provided, return a health check
    if (!targetUrl) {
      return new Response("Bong Bari Swarm Worker is Active. Pass ?url=... to proxy.", { status: 200 });
    }

    // 1. Copy headers from the incoming request
    const newHeaders = new Headers(request.headers);
    
    // 2. Strip identifying Cloudflare/Browser headers so the target doesn't know it's a proxy
    newHeaders.delete("Host");
    newHeaders.delete("Origin");
    newHeaders.delete("Referer");
    newHeaders.delete("CF-Connecting-IP");
    newHeaders.delete("CF-IPCountry");
    newHeaders.delete("CF-Ray");
    newHeaders.delete("X-Forwarded-Proto");
    newHeaders.delete("X-Forwarded-For");

    // 3. (Optional) Force Instagram Mobile Spoofing at the Edge Layer
    if (targetUrl.includes("instagram.com")) {
      newHeaders.set("User-Agent", "Instagram 219.0.0.12.117 Android");
    }

    // 4. Create the new proxy request
    const modifyRequest = new Request(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "follow"
    });

    try {
      // 5. Fetch from the target (Instagram/Facebook/Youtube) using Cloudflare's IP
      const proxyResponse = await fetch(modifyRequest);
      const responseHeaders = new Headers(proxyResponse.headers);
      
      // 6. Ensure CORS is open so our Hetzner/Render backend can read it
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "*");
      
      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response("Swarm Proxy Error: " + e.message, { status: 500 });
    }
  }
};
