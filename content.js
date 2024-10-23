document.addEventListener('click', async function(e) {
  if (e.altKey) {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    
    let mediaUrl = null;
    let filename = 'download';
    
    // Enhanced video element finder
    const findVideoElement = (element) => {
      if (element.tagName === 'VIDEO') return element;
      
      // Check for video in parent chain
      let current = element;
      while (current && current !== document.body) {
        const video = current.querySelector('video');
        if (video) return video;
        current = current.parentElement;
      }
      
      // Check for iframe or shadow DOM video players
      const shadowRoot = element.shadowRoot || 
                        (element.closest('[data-player]') || {}).shadowRoot;
      if (shadowRoot) {
        const shadowVideo = shadowRoot.querySelector('video');
        if (shadowVideo) return shadowVideo;
      }
      
      return null;
    };
    
    const getVideoUrl = (videoElement) => {
      // Try all possible sources
      return videoElement.currentSrc || 
             videoElement.src ||
             (videoElement.querySelector('source') || {}).src ||
             Array.from(videoElement.getElementsByTagName('source')).map(s => s.src)[0] ||
             (videoElement.dataset.src) || // Check for data-src attribute
             (videoElement.poster); // Fallback to poster image
    };
    
    // Handle media types
    if (element.tagName === 'IMG') {
      mediaUrl = element.src || element.currentSrc;
      filename = mediaUrl.split('/').pop() || 'image.jpg';
    } else {
      const videoElement = findVideoElement(element);
      if (videoElement) {
        mediaUrl = getVideoUrl(videoElement);
        
        if (mediaUrl) {
          if (mediaUrl === videoElement.poster) {
            filename = 'video-thumbnail.jpg';
          } else {
            filename = mediaUrl.split('/').pop() || 'video.mp4';
          }
        } else {
          // Try to get the media stream URL
          try {
            const mediaStream = await videoElement.captureStream();
            const mediaRecorder = new MediaRecorder(mediaStream);
            let chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/mp4' });
              const blobUrl = URL.createObjectURL(blob);
              chrome.runtime.sendMessage({
                type: 'downloadMedia',
                url: blobUrl,
                filename: 'video.mp4'
              });
              URL.revokeObjectURL(blobUrl);
            };
            
            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), 100); // Capture a short segment
            return;
          } catch (err) {
            console.error('Failed to capture video stream:', err);
          }
        }
      }
    }
    
    // Process the download
    if (mediaUrl) {
      e.preventDefault();
      e.stopPropagation();
      
      if (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) {
        try {
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          chrome.runtime.sendMessage({
            type: 'downloadMedia',
            url: blobUrl,
            filename: filename
          });
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (error) {
          console.error('Download failed:', error);
        }
      } else {
        chrome.runtime.sendMessage({
          type: 'downloadMedia',
          url: mediaUrl,
          filename: filename
        });
      }
    }
  }
});

