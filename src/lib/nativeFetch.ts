export async function nativeFetch(url: string, options: any = {}): Promise<Response> {
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.() || 
                   !!(window as any).Capacitor?.isNative ||
                   !!(window as any).cordova;

  if (isNative && (window as any).cordova?.plugin?.http) {
    const cordovaHttp = (window as any).cordova.plugin.http;
    
    return new Promise((resolve, reject) => {
      const method = (options.method || 'GET').toLowerCase();
      const headers = options.headers || {};
      let data = options.body;
      
      if (typeof data === 'string' && headers['Content-Type']?.includes('application/json')) {
        try {
          data = JSON.parse(data);
        } catch(e) {}
      }

      cordovaHttp.setDataSerializer(method === 'post' || method === 'put' ? 'json' : 'utf8');

      cordovaHttp.sendRequest(url, {
        method: method,
        data: data,
        headers: headers,
        responseType: 'text'
      }, (response: any) => {
        const fetchResponse = new Response(response.data, {
          status: response.status,
          headers: new Headers(response.headers || {})
        });
        resolve(fetchResponse);
      }, (error: any) => {
        if (error.status) {
          resolve(new Response(error.error || error.data || 'Erreur réseau Cordova', {
            status: error.status,
            headers: new Headers(error.headers || {})
          }));
        } else {
          reject(new Error(error.error || 'Échec de la requête réseau Cordova'));
        }
      });
    });
  }

  // Fallback to standard browser fetch
  return fetch(url, options);
}
