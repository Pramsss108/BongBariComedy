export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let targetUrlStr = url.searchParams.get("url");

    if (!targetUrlStr) {
      return new Response("Bong Bari Swarm Worker is Active. Pass ?url=... to proxy.", { status: 200 });
    }
    
    const mode = url.searchParams.get("mode");
    
    // For Instagram API extraction trick
    if (mode === "ig_api" && targetUrlStr.includes("instagram.com")) {
       targetUrlStr = targetUrlStr.split('?')[0] + "?__a=1&__d=dis";
    }

    const newHeaders = new Headers(request.headers);
    newHeaders.delete("Host");
    newHeaders.delete("Origin");
    newHeaders.delete("Referer");
    newHeaders.delete("CF-Connecting-IP");
    newHeaders.delete("CF-IPCountry");
    newHeaders.delete("X-Forwarded-For");

    if (targetUrlStr.includes("instagram.com")) {
      newHeaders.set("User-Agent", "Instagram 219.0.0.12.117 Android");
      newHeaders.set("x-ig-app-id", "936619743392459"); // Magic Header
    }

    const modifyRequest = new Request(targetUrlStr, {
      method: request.method,
      headers: newHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
      redirect: "follow"
    });

    try {
      const proxyResponse = await fetch(modifyRequest);
      const responseHeaders = new Headers(proxyResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response("Swarm Error: " + e.message, { status: 500 });
    }
  }
};
