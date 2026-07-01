const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream('/app/applet/orvuex_flutter/assets/images/orvuex_logo.png');
https.get('https://i.ibb.co/TqBFq7t4/store-icon.png', (res) => {
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download Completed');
  });
});
