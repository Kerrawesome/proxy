const fetch = require('node-fetch');
const { URL } = require('url');

module.exports = async (req, res) => {
  const targetUrlString = req.query.url;

  if (!targetUrlString) {
    // Return a helpful landing page if no URL is provided.
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <body style="font-family: sans-serif; display: grid; place-content: center; height: 100vh; margin: 0; background-color: #f7f7f7;">
        <div style="text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1>Popup-Blocking Proxy</h1>
          <p style="margin-bottom: 20px;">Please provide a URL to proxy. <br> Add it to the end of the current address:</p>
          <code style="background: #eee; padding: 5px 10px; border-radius: 5px;">?url=https://example.com</code>
        </div>
      </body>
    `);
  }

  // **IMPROVEMENT 1: Better URL Validation**
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlString);
  } catch (error) {
    // Log the actual error for debugging
    console.error("Invalid URL provided:", targetUrlString, error);
    return res.status(400).send(`Invalid URL provided: ${targetUrlString}`);
  }

  try {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.5',
    };

    const response = await fetch(targetUrl.href, { headers });
    
    // Check if the request was successful
    if (!response.ok) {
        console.error(`Target server responded with status: ${response.status}`, { url: targetUrl.href });
        return res.status(response.status).send(`The target website responded with an error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let body = await response.text();
      const baseTag = `<base href="${targetUrl.origin}">`;
      const injection = `
        <head>
          ${baseTag}
          <script>
            window.open = function(...args) {
              console.log('Popup blocked:', args[0]);
              return null;
            };
          </script>
      `;
      body = body.replace('<head>', injection);

      res.setHeader('Content-Type', 'text/html');
      res.send(body);

    } else {
      const buffer = await response.buffer();
      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    }
  } catch (error) {
    // **IMPROVEMENT 2: Log the actual fetch error**
    // This is the most important part for debugging 500 errors.
    console.error('--- PROXY FETCH FAILED ---');
    console.error('Target URL:', targetUrl.href);
    console.error('Error Message:', error.message);
    console.error(error); // Log the full error object
    console.error('--- END OF ERROR ---');

    res.status(500).send(`Error: The proxy failed to fetch the URL. The site may be blocking it. Check the Vercel logs for more details.`);
  }
};
