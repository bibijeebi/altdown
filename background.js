chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'downloadMedia') {
      chrome.downloads.download({
        url: request.url,
        filename: request.filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        }
      });
    }
  });