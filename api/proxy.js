const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Extract the target URL from the query string
  const urlParam = Object.keys(req.query)[0];
  const targetUrl = req.query[urlParam];

  if (!targetUrl) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <body style="font-family: sans-serif; padding: 2em;">
        <h1>Proxy Server</h1>
        <p>Please provide a URL to proxy. Example:</p>
        <p><a href="?https://example.com">?https://example.com</a></p>
      </body>
    `);
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Vercel-Proxy/1.0' }
    });
    const contentType = response.headers.get('content-type') || '';

    // If the content is HTML, inject the popup blocker script
    if (contentType.includes('text/html')) {
      let body = await response.text();

      const popupBlockerScript = `
        <script>
          // Override window.open to block popups
          window.open = function(url, name, features) {
            console.log('Popup blocked for:', url);
            // Return null to prevent the window from opening
            return null;
          };
        </script>
      \`;

      // Inject the script right before the closing </head> tag
      body = body.replace('</head>', \`\${popupBlockerScript}</head>\`);

      res.setHeader('Content-Type', 'text/html');
      res.send(body);

    } else {
      // For non-HTML content (images, CSS, etc.), just pass it through
      const buffer = await response.buffer();
      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: Could not fetch the requested URL.');
  }
};
