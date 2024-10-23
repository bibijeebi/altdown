document.addEventListener('click', function(e) {
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
      filename = mediaUrl.split('/').pop() || 'video.mp4';
    }
    
    // If media URL found, initiate download
    if (mediaUrl) {
      // Prevent default click behavior
      e.preventDefault();
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
});