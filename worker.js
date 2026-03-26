export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API Proxy 逻辑
    if (url.pathname.startsWith('/api-proxy')) {
      const path = url.pathname.replace(/^\/api-proxy/, '');
      const targetUrl = `https://mail.dynmsl.com/api/public${path}${url.search}`;

      try {
        return await fetch(new Request(targetUrl, request), { redirect: 'follow' });
      } catch (err) {
        return new Response(`API Proxy Error: ${err.message}`, { status: 500 });
      }
    }

    if (env.ASSETS) {
      let decodedPath = url.pathname;
      try {
        decodedPath = decodeURIComponent(url.pathname);
      } catch {}
      const normalizedPath = decodedPath.replace(/\/+$/, "") || "/";
      const isApi = url.pathname.startsWith('/api-proxy');
      const lastSegment = normalizedPath.split('/').pop() || "";
      const hasAssetExtension = /\.(?:js|mjs|css|png|jpg|jpeg|gif|webp|svg|ico|map|txt|json|woff2?|ttf|eot|wasm)$/i.test(lastSegment);
      const isEmailPath = /^\/[^/]*@[^/]*$/.test(normalizedPath);

      if (!isApi && (isEmailPath || !hasAssetExtension)) {
        const indexUrl = new URL('/index.html', request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (!isApi && assetResponse.status === 404) {
        const indexUrl = new URL('/index.html', request.url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return assetResponse;
    }
    
    return new Response("Not found", { status: 404 });
  }
}
