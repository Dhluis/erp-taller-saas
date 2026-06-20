const https = require('https');
const fs = require('fs');
const path = require('path');

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  try {
    console.log('Downloading Horizontal Logo...');
    await downloadFile(
      'https://i.ibb.co/5h083nG9/cmyk-confia-drive-Mesa-de-trabajo-1-copia-1.png', 
      path.join(__dirname, 'public', 'eagles-logo-dark.png')
    );
    
    console.log('Downloading Square Icon...');
    await downloadFile(
      'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg', 
      path.join(__dirname, 'src', 'app', 'icon.png')
    );
    await downloadFile(
      'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg', 
      path.join(__dirname, 'public', 'eagles-icon.png')
    );

    console.log('All downloads completed successfully.');
  } catch (e) {
    console.error('Error downloading:', e);
  }
}

main();
