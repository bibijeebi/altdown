var disableDrag;
var uniques = [];
var delay;
var current = 0;
var value;

// Add video extensions to look for
const mediaExtensions = {
  images: ['jpg', 'gif', 'png', 'webp'],
  videos: ['mp4', 'webm', 'mov', 'avi']
};

// Create regex patterns for both images and videos
const createPattern = (extensions, protocol) => {
  const extensionPattern = extensions.join('|');
  return new RegExp(`(${protocol}:[\\w\\/\\.\\-]+\\.(?:${extensionPattern}))`, 'gi');
};

chrome.runtime.sendMessage({
  changeTitle: true,
  text: "",
});

chrome.storage.sync.get(
  {
    disableDrag: false,
  },
  function (items) {
    disableDrag = items.disableDrag;
  }
);

chrome.storage.onChanged.addListener(function () {
  chrome.storage.sync.get(
    {
      disableDrag: false,
    },
    function (items) {
      disableDrag = items.disableDrag;
    }
  );
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "search_media") {
    var qualified_url;
    var mediaFiles = [];
    var b = document.body.innerHTML;

    // Search for both images and videos
    const allExtensions = [...mediaExtensions.images, ...mediaExtensions.videos];
    const httpPattern = createPattern(allExtensions, 'http');
    const httpsPattern = createPattern(allExtensions, 'https');

    var httpMedia = b.match(httpPattern);
    var httpsMedia = b.match(httpsPattern);

    // Get all media elements
    var imgs = Array.from(document.querySelectorAll("img")).map(img => img.src);
    var videos = Array.from(document.querySelectorAll("video")).map(video => video.src);
    var videoSources = Array.from(document.querySelectorAll("video source")).map(source => source.src);

    mediaFiles = mediaFiles.concat(httpMedia || []);
    mediaFiles = mediaFiles.concat(httpsMedia || []);
    mediaFiles = mediaFiles.concat(imgs);
    mediaFiles = mediaFiles.concat(videos);
    mediaFiles = mediaFiles.concat(videoSources);

    // Search for relative paths for both images and videos
    var relatives = b.match(
      new RegExp(`(src\\s?=\\s?[\\"\\']?[\\w\\/\\.\\-]+\\.(?:${allExtensions.join('|')}))`, 'gi')
    );

    // Search for background videos (some sites use video backgrounds)
    var bg_elements = Array.from(document.querySelectorAll("*")).filter(function(el) {
      const style = getComputedStyle(el);
      return style.backgroundImage !== "none" || style.background.includes('video');
    });

    uniques = [];
    var index = [];

    if (mediaFiles) {
      for (var j = 0; j < mediaFiles.length; j++) {
        qualified_url = qualifiedUrl(mediaFiles[j]);
        if (!index[qualified_url]) {
          uniques.push(qualified_url);
          index[qualified_url] = true;
        }
      }
    }

    if (relatives) {
      for (j = 0; j < relatives.length; j++) {
        var clean_url = relatives[j].split(" ").join("").slice(5);
        qualified_url = qualifiedUrl(clean_url);
        if (!index[qualified_url]) {
          uniques.push(qualified_url);
          index[qualified_url] = true;
        }
      }
    }

    if (bg_elements.length > 0) {
      for (j = 0; j < bg_elements.length; j++) {
        var style = getComputedStyle(bg_elements[j]);
        var bg_txt = style.backgroundImage.slice(4, -1);
        var valid = validMedia(bg_txt);

        if (valid) {
          qualified_url = qualifiedUrl(valid);

          if (!index[qualified_url]) {
            uniques.push(qualified_url);
            index[qualified_url] = true;
          }
        }
      }
    }

    if (uniques.length > 0) {
      var mediaContainer = document.querySelector("#imagentleman");

      if (!mediaContainer) {
        mediaContainer = document.createElement("div");
        mediaContainer.id = "imagentleman";
        document.body.appendChild(mediaContainer);
      }

      mediaContainer.innerHTML = "";
      mediaContainer.style.display = "none";

      var mediaElements = document.querySelector("#imagentlemanimgs");

      if (!mediaElements) {
        mediaElements = document.createElement("div");
        mediaElements.id = "imagentlemanimgs";
        document.body.appendChild(mediaElements);
      }

      mediaElements.innerHTML = "";
      mediaElements.style.display = "none";

      current = 0;

      if (uniques.length > 0) {
        delay = setTimeout(scheduleDownload, 200);
      }
    }

    var page = { media: uniques };
    sendResponse(page);

    chrome.runtime.sendMessage({
      category: "browser-action",
      action: "clicked",
    });
  } else if (request.action === "stop_downloads") {
    clearTimeout(delay);
    current = 0;
    uniques = [];

    chrome.runtime.sendMessage({
      changeTitle: true,
      text: "",
    });
    sendResponse({});
  }
});

function qualifiedUrl(url) {
  // Handle both image and video URLs
  const extension = url.split('.').pop().toLowerCase();
  
  if (mediaExtensions.images.includes(extension)) {
    var img = document.createElement("img");
    img.src = url;
    return img.src;
  } else if (mediaExtensions.videos.includes(extension)) {
    var video = document.createElement("video");
    video.src = url;
    return video.src;
  }
  return url;
}

function validMedia(txt) {
  const allExtensions = [...mediaExtensions.images, ...mediaExtensions.videos];
  return txt.match(new RegExp(`([\\w\\/\\.\\-]+\\.(?:${allExtensions.join('|')}))`, 'gi'));
}

function validName(txt) {
  const allExtensions = [...mediaExtensions.images, ...mediaExtensions.videos];
  return txt.match(new RegExp(`([^\\.\\/*]*\\.(?:${allExtensions.join('|')}))`, 'gi'));
}

function requestMedia(element, type) {
  var mediaContainer = document.querySelector("#imagentleman");

  if (!mediaContainer) {
    mediaContainer = document.createElement("div");
    mediaContainer.id = "imagentleman";
    document.body.appendChild(mediaContainer);
  }

  mediaContainer.innerHTML = "";
  mediaContainer.style.display = "none";

  var extension = element.src.split('.').pop().toLowerCase();
  var tag;
  
  if (mediaExtensions.images.includes(extension)) {
    tag = document.createElement("img");
  } else if (mediaExtensions.videos.includes(extension)) {
    tag = document.createElement("video");
  }
  
  tag.src = element.src;
  var qualified_url = tag.src;

  chrome.runtime.sendMessage({
    downloadMedia: true,
    url: qualified_url,
    type: mediaExtensions.images.includes(extension) ? 'image' : 'video'
  });

  chrome.runtime.sendMessage({ category: type, action: "download" });
}

function hiddenMedia(e) {
  var cands = [];
  var cindex = [];

  var containers = Array.from(document.querySelectorAll("img, video, source, i, div"));

  containers.forEach(function(v) {
    var rect = v.getBoundingClientRect();
    var bgImage;

    if (
      rect.top <= e.pageY &&
      rect.left <= e.pageX &&
      e.pageX <= rect.left + v.clientWidth &&
      e.pageY <= rect.top + v.clientHeight
    ) {
      var qualified_url;

      if (v.tagName === "IMG" || v.tagName === "VIDEO" || v.tagName === "SOURCE") {
        qualified_url = qualifiedUrl(v.src);
      } else if ((bgImage = getComputedStyle(v).backgroundImage) !== "none") {
        var valid = validMedia(bgImage.slice(4, -1));
        if (valid) {
          qualified_url = qualifiedUrl(valid);
        }
      }

      if (qualified_url && !cindex[qualified_url]) {
        cands.push(qualified_url);
        cindex[qualified_url] = true;

        e.stopPropagation();
      }
    }
  });

  cands.forEach(function(val) {
    requestMedia({ src: val }, "hotkey");
  });

  if (cands.length > 0) {
    e.preventDefault();
  }
}

function scheduleDownload() {
  current++;
  if (current >= uniques.length) {
    clearTimeout(delay);
    current = 0;
    uniques = [];

    chrome.runtime.sendMessage({
      changeTitle: true,
      text: "",
    });
    return;
  } else {
    value = uniques[current];
  }

  var mediaElements = document.querySelector("#imagentlemanimgs");
  var extension = value.split('.').pop().toLowerCase();
  var element;

  if (mediaExtensions.images.includes(extension)) {
    element = document.createElement("img");
  } else if (mediaExtensions.videos.includes(extension)) {
    element = document.createElement("video");
  }

  element.id = "fetcher";
  element.src = value;
  mediaElements.appendChild(element);

  chrome.runtime.sendMessage({
    downloadMedia: true,
    url: value,
    type: mediaExtensions.images.includes(extension) ? 'image' : 'video'
  });

  delay = setTimeout(scheduleDownload, 200);
}

// Event Listeners for both images and videos
document.addEventListener("click", function(e) {
  if (e.altKey) {
    if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
      requestMedia({ src: e.target.src }, "hotkey");
      e.preventDefault();
    } else {
      hiddenMedia(e);
    }

    e.stopPropagation();
  }
});

document.addEventListener("dragend", function(e) {
  if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
    if (!disableDrag) {
      requestMedia({ src: e.target.src }, "drag");
    }
  }
});