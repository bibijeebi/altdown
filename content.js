// Cleanup function to remove event listener if extension context is invalidated
function setupMediaDownloader() {
  function handleClick(e) {
    // Check if Alt key is held down
    if (e.altKey) {
      // Get element under cursor
      const element = document.elementFromPoint(e.clientX, e.clientY);
      
      if (!element) return;
      
      let mediaUrl = null;
      let filename = 'download';
      
      // Handle different media types
      if (element.tagName === 'IMG') {
        mediaUrl = element.src;
        filename = element.src.split('/').pop() || 'image.jpg';
      } else if (element.tagName === 'VIDEO') {
        mediaUrl = element.currentSrc || element.src;
        if (!mediaUrl && element.querySelector('source')) {
          mediaUrl = element.querySelector('source').src;
        }
        filename = mediaUrl?.split('/').pop() || 'video.mp4';
      }
      
      // If media URL found, send to background script for download
      if (mediaUrl) {
        // Prevent default click behavior
        e.preventDefault();
        e.stopPropagation();
        
        try {
          chrome.runtime.sendMessage({
            type: 'download',
            url: mediaUrl,
            filename: filename
          });
        } catch (err) {
          // If extension context is invalid, remove the listener
          document.removeEventListener('click', handleClick, true);
        }
      }
    }
  }

  // Add listener with capture phase
  document.addEventListener('click', handleClick, true);
}

// Setup the downloader
setupMediaDownloader();