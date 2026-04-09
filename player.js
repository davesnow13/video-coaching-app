// Supabase Configuration
const SUPABASE_URL = 'https://mpsizlkawqxfrdsuhizj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc2l6bGthd3F4ZnJkc3VoaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzMzNTcsImV4cCI6MjA5MDgwOTM1N30.87hhI6d-FmXAuehwV4ciVFX3En1G2x3fCUYPpAIS5c8';

// Initialize Supabase client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// View mode
let isSplitView = false;
let isSynced = true;
let selectedVideos = []; // Max 2 videos in split mode

// Sync offset tracking
let syncTimeOffset = 0; // Video2 time - Video1 time

// Get DOM elements
const videoList = document.getElementById('videoList');
const loadingVideos = document.getElementById('loadingVideos');
const noVideoMessage = document.getElementById('noVideoMessage');
const playerSection = document.getElementById('playerSection');
const playerContainer = document.getElementById('playerContainer');
const splitModeInfo = document.getElementById('splitModeInfo');

const singleViewBtn = document.getElementById('singleViewBtn');
const splitViewBtn = document.getElementById('splitViewBtn');
const syncBtn = document.getElementById('syncBtn');

// Player 1
const playerWrapper1 = document.getElementById('playerWrapper1');
const playerArea1 = document.getElementById('playerArea1');
const videoPlayer1 = document.getElementById('videoPlayer1');
const canvas1 = document.getElementById('annotationCanvas1');
const ctx1 = canvas1.getContext('2d');
const videoLabel1 = document.getElementById('videoLabel1');

// Player 2
const playerWrapper2 = document.getElementById('playerWrapper2');
const playerArea2 = document.getElementById('playerArea2');
const videoPlayer2 = document.getElementById('videoPlayer2');
const canvas2 = document.getElementById('annotationCanvas2');
const ctx2 = canvas2.getContext('2d');
const videoLabel2 = document.getElementById('videoLabel2');

// Main controls
const playPauseBtn = document.getElementById('playPauseBtn');
const prevFrameBtn = document.getElementById('prevFrameBtn');
const nextFrameBtn = document.getElementById('nextFrameBtn');
const seekBar = document.getElementById('seekBar');
const timestamp = document.getElementById('timestamp');
const speedBtns = document.querySelectorAll('.speed-btn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const resetZoomBtn = document.getElementById('resetZoomBtn');
const toolBtns = document.querySelectorAll('.tool-btn');
const clearBtn = document.getElementById('clearBtn');
const colorBtns = document.querySelectorAll('.color-btn');

// Annotation settings
const lineThicknessSlider = document.getElementById('lineThickness');
const thicknessValue = document.getElementById('thicknessValue');
const textSizeSlider = document.getElementById('textSize');
const textSizeValue = document.getElementById('textSizeValue');

// Individual controls for Player 1
const playPause1 = document.getElementById('playPause1');
const prevFrame1 = document.getElementById('prevFrame1');
const nextFrame1 = document.getElementById('nextFrame1');
const seekBar1 = document.getElementById('seekBar1');
const timestamp1 = document.getElementById('timestamp1');

// Individual controls for Player 2
const playPause2 = document.getElementById('playPause2');
const prevFrame2 = document.getElementById('prevFrame2');
const nextFrame2 = document.getElementById('nextFrame2');
const seekBar2 = document.getElementById('seekBar2');
const timestamp2 = document.getElementById('timestamp2');

// Drawing state
let currentTool = null;
let currentColor = '#2ecc71';
let lineThickness = 5;
let textSize = 32;
let isDrawing = false;
let isPanning = false;
let startX, startY;
let panStartX, panStartY, scrollStartX, scrollStartY;
let annotations1 = [];
let annotations2 = [];
let anglePoints1 = [];
let anglePoints2 = [];
let activeCanvas = 1; // Which canvas is being drawn on

// Load videos from Supabase Storage
async function loadVideos() {
    console.log('Loading videos...');
    
    try {
        const { data, error } = await sb
            .storage
            .from('coach-videos')
            .list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            });
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
            console.error('Supabase error:', error);
            loadingVideos.textContent = 'Error: ' + error.message;
            return;
        }
        
        loadingVideos.style.display = 'none';
        
        if (!data || data.length === 0) {
            videoList.innerHTML = '<li style="color: #666; padding: 12px;">No videos found</li>';
            return;
        }
        
        videoList.innerHTML = '';
        
        data.forEach(file => {
            if (file.name && file.id) {
                const li = document.createElement('li');
                li.className = 'video-item';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'video-item-name';
                nameSpan.textContent = file.name;
                nameSpan.onclick = () => handleVideoSelection(file.name);
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'video-item-actions';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '🗑️';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteVideo(file.name);
                };
                
                actionsDiv.appendChild(deleteBtn);
                
                li.appendChild(nameSpan);
                li.appendChild(actionsDiv);
                li.dataset.filename = file.name;
                
                videoList.appendChild(li);
            }
        });
        
        console.log('Loaded', data.length, 'videos');
        
    } catch (error) {
        console.error('Error loading videos:', error);
        loadingVideos.textContent = 'Error: ' + error.message;
    }
}

// Delete video from Supabase
async function deleteVideo(filename) {
    const confirmDelete = confirm(`Delete "${filename}"?\n\nThis cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }
    
    console.log('Deleting video:', filename);
    
    try {
        const { data, error } = await sb
            .storage
            .from('coach-videos')
            .remove([filename]);
        
        if (error) {
            console.error('Delete error:', error);
            alert('Failed to delete video: ' + error.message);
            return;
        }
        
        console.log('Video deleted successfully:', data);
        
        // Remove from selected videos if it was selected
        selectedVideos = selectedVideos.filter(v => v !== filename);
        
        // Remove from UI immediately
        const videoItem = document.querySelector(`.video-item[data-filename="${filename}"]`);
        if (videoItem) {
            videoItem.remove();
        }
        
        // If the deleted video was currently playing, clear the player
        if (videoPlayer1.src && videoPlayer1.src.includes(filename)) {
            videoPlayer1.src = '';
            videoPlayer1.pause();
            annotations1 = [];
            ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
            
            // If no videos left, show no video message
            const remainingVideos = document.querySelectorAll('.video-item').length;
            if (remainingVideos === 0) {
                noVideoMessage.style.display = 'block';
                playerSection.style.display = 'none';
            }
        }
        if (videoPlayer2.src && videoPlayer2.src.includes(filename)) {
            videoPlayer2.src = '';
            videoPlayer2.pause();
            annotations2 = [];
            ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        }
        
        // Update selection UI
        updateVideoListUI();
        
    } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video: ' + error.message);
    }
}

// Handle video selection based on mode
function handleVideoSelection(filename) {
    if (!isSplitView) {
        // Single view mode - just load the video
        loadVideo(filename, 1);
        selectedVideos = [filename];
    } else {
        // Split view mode - select up to 2 videos
        const index = selectedVideos.indexOf(filename);
        
        if (index > -1) {
            // Already selected - deselect it
            selectedVideos.splice(index, 1);
        } else {
            if (selectedVideos.length < 2) {
                // Add to selection
                selectedVideos.push(filename);
            } else {
                // Replace oldest selection
                selectedVideos.shift();
                selectedVideos.push(filename);
            }
        }
        
        // Update UI
        updateVideoListUI();
        
        // Load videos
        if (selectedVideos.length >= 1) {
            loadVideo(selectedVideos[0], 1);
        }
        if (selectedVideos.length >= 2) {
            loadVideo(selectedVideos[1], 2);
        }
    }
    
    // Collapse sidebar on mobile after selection
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('collapsed');
    }
}

// Update video list UI to show selection state
function updateVideoListUI() {
    document.querySelectorAll('.video-item').forEach(item => {
        const filename = item.dataset.filename;
        item.classList.remove('active', 'selected-1', 'selected-2');
        
        // Remove any existing badges
        const existingBadge = item.querySelector('.selection-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        if (selectedVideos[0] === filename) {
            item.classList.add('selected-1');
            const badge = document.createElement('span');
            badge.className = 'selection-badge';
            badge.textContent = '1';
            item.querySelector('.video-item-actions').insertBefore(badge, item.querySelector('.delete-btn'));
        } else if (selectedVideos[1] === filename) {
            item.classList.add('selected-2');
            const badge = document.createElement('span');
            badge.className = 'selection-badge';
            badge.textContent = '2';
            item.querySelector('.video-item-actions').insertBefore(badge, item.querySelector('.delete-btn'));
        }
    });
}

// Load and display selected video
async function loadVideo(filename, playerNum) {
    console.log('Loading video:', filename, 'into player', playerNum);
    
    try {
        const { data } = sb
            .storage
            .from('coach-videos')
            .getPublicUrl(filename);
        
        console.log('Video URL:', data.publicUrl);
        
        const videoPlayer = playerNum === 1 ? videoPlayer1 : videoPlayer2;
        const videoLabel = playerNum === 1 ? videoLabel1 : videoLabel2;
        
        videoPlayer.src = data.publicUrl;
        videoLabel.textContent = filename;
        
        noVideoMessage.style.display = 'none';
        playerSection.style.display = 'block';
        
        videoPlayer.onloadedmetadata = () => {
            resizeCanvas(playerNum);
        };
        
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Error loading video: ' + error.message);
    }
}

// Resize canvas to match video display size
function resizeCanvas(playerNum) {
    const videoPlayer = playerNum === 1 ? videoPlayer1 : videoPlayer2;
    const canvas = playerNum === 1 ? canvas1 : canvas2;
    
    const videoRect = videoPlayer.getBoundingClientRect();
    
    // Canvas internal resolution matches video native resolution
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight;
    
    // Canvas display size matches video display size
    canvas.style.width = videoRect.width + 'px';
    canvas.style.height = videoRect.height + 'px';
    
    redrawAnnotations(playerNum);
    console.log('Canvas', playerNum, 'resized:', canvas.width, 'x', canvas.height);
}

// Resize canvas when window is resized
window.addEventListener('resize', () => {
    setTimeout(() => {
        resizeCanvas(1);
        if (isSplitView) {
            resizeCanvas(2);
        }
    }, 100);
});

// View mode toggles
singleViewBtn.onclick = () => {
    isSplitView = false;
    singleViewBtn.classList.add('active');
    splitViewBtn.classList.remove('active');
    playerContainer.classList.remove('split-view');
    playerWrapper2.style.display = 'none';
    syncBtn.style.display = 'none';
    splitModeInfo.style.display = 'none';
    
    // Hide individual controls
    playerWrapper1.classList.remove('show-controls');
    playerWrapper2.classList.remove('show-controls');
    
    selectedVideos = [];
    updateVideoListUI();
    
    console.log('Switched to single view');
};

splitViewBtn.onclick = () => {
    isSplitView = true;
    splitViewBtn.classList.add('active');
    singleViewBtn.classList.remove('active');
    playerContainer.classList.add('split-view');
    playerWrapper2.style.display = 'block';
    syncBtn.style.display = 'inline-block';
    splitModeInfo.style.display = 'block';
    
    selectedVideos = [];
    updateVideoListUI();
    
    console.log('Switched to split view');
};

// Sync toggle
syncBtn.onclick = () => {
    isSynced = !isSynced;
    syncBtn.textContent = isSynced ? '🔗 Synced' : '🔓 Unsynced';
    syncBtn.classList.toggle('active', isSynced);
    
    // Show/hide individual controls based on sync state
    if (isSynced) {
        playerWrapper1.classList.remove('show-controls');
        playerWrapper2.classList.remove('show-controls');
        
        // Calculate and lock the time offset between videos
        if (videoPlayer1.src && videoPlayer2.src) {
            syncTimeOffset = videoPlayer2.currentTime - videoPlayer1.currentTime;
            console.log('Sync enabled - locked offset:', syncTimeOffset.toFixed(2), 'seconds');
            console.log('Video 1 at:', formatTime(videoPlayer1.currentTime));
            console.log('Video 2 at:', formatTime(videoPlayer2.currentTime));
        }
    } else {
        playerWrapper1.classList.add('show-controls');
        playerWrapper2.classList.add('show-controls');
        syncTimeOffset = 0;
        console.log('Sync disabled - independent control enabled');
    }
};

// Individual Player 1 Controls
playPause1.onclick = () => {
    if (videoPlayer1.paused) {
        videoPlayer1.play();
        playPause1.textContent = '⏸';
    } else {
        videoPlayer1.pause();
        playPause1.textContent = '▶';
    }
};

prevFrame1.onclick = () => {
    videoPlayer1.currentTime -= 1/30;
};

nextFrame1.onclick = () => {
    videoPlayer1.currentTime += 1/30;
};

seekBar1.oninput = () => {
    const time = (seekBar1.value / 100) * videoPlayer1.duration;
    videoPlayer1.currentTime = time;
};

videoPlayer1.ontimeupdate = () => {
    // Update individual seekbar and timestamp
    const percent1 = (videoPlayer1.currentTime / videoPlayer1.duration) * 100;
    seekBar1.value = percent1 || 0;
    timestamp1.textContent = formatTime(videoPlayer1.currentTime);
    
    // Update main controls (only if synced or single view)
    if (!isSplitView || isSynced) {
        const percent = (videoPlayer1.currentTime / videoPlayer1.duration) * 100;
        seekBar.value = percent || 0;
        
        const current = formatTime(videoPlayer1.currentTime);
        const duration = formatTime(videoPlayer1.duration);
        timestamp.textContent = `${current} / ${duration}`;
    }
};

// Individual Player 2 Controls
playPause2.onclick = () => {
    if (videoPlayer2.paused) {
        videoPlayer2.play();
        playPause2.textContent = '⏸';
    } else {
        videoPlayer2.pause();
        playPause2.textContent = '▶';
    }
};

prevFrame2.onclick = () => {
    videoPlayer2.currentTime -= 1/30;
};

nextFrame2.onclick = () => {
    videoPlayer2.currentTime += 1/30;
};

seekBar2.oninput = () => {
    const time = (seekBar2.value / 100) * videoPlayer2.duration;
    videoPlayer2.currentTime = time;
};

videoPlayer2.ontimeupdate = () => {
    // Update individual seekbar and timestamp
    const percent2 = (videoPlayer2.currentTime / videoPlayer2.duration) * 100;
    seekBar2.value = percent2 || 0;
    timestamp2.textContent = formatTime(videoPlayer2.currentTime);
};

// Zoom control
zoomSlider.oninput = () => {
    const zoom = zoomSlider.value / 100;
    playerArea1.style.transform = `scale(${zoom})`;
    if (isSplitView) {
        playerArea2.style.transform = `scale(${zoom})`;
    }
    zoomValue.textContent = zoomSlider.value + '%';
    
    setTimeout(() => {
        resizeCanvas(1);
        if (isSplitView) resizeCanvas(2);
    }, 50);
};

resetZoomBtn.onclick = () => {
    zoomSlider.value = 100;
    playerArea1.style.transform = 'scale(1)';
    playerArea2.style.transform = 'scale(1)';
    zoomValue.textContent = '100%';
    playerWrapper1.scrollLeft = 0;
    playerWrapper1.scrollTop = 0;
    playerWrapper2.scrollLeft = 0;
    playerWrapper2.scrollTop = 0;
    setTimeout(() => {
        resizeCanvas(1);
        if (isSplitView) resizeCanvas(2);
    }, 50);
};

// Main Playback controls (work when synced)
playPauseBtn.onclick = () => {
    if (videoPlayer1.paused) {
        videoPlayer1.play();
        if (isSplitView && isSynced && videoPlayer2.src) {
            videoPlayer2.play();
        }
        playPauseBtn.textContent = '⏸ Pause';
    } else {
        videoPlayer1.pause();
        if (isSplitView && isSynced && videoPlayer2.src) {
            videoPlayer2.pause();
        }
        playPauseBtn.textContent = '▶ Play';
    }
};

prevFrameBtn.onclick = () => {
    videoPlayer1.currentTime -= 1/30;
    if (isSplitView && isSynced && videoPlayer2.src) {
        videoPlayer2.currentTime = Math.max(0, videoPlayer1.currentTime + syncTimeOffset);
    }
};

nextFrameBtn.onclick = () => {
    videoPlayer1.currentTime += 1/30;
    if (isSplitView && isSynced && videoPlayer2.src) {
        const newTime = videoPlayer1.currentTime + syncTimeOffset;
        videoPlayer2.currentTime = Math.min(newTime, videoPlayer2.duration);
    }
};

seekBar.oninput = () => {
    const time = (seekBar.value / 100) * videoPlayer1.duration;
    videoPlayer1.currentTime = time;
    if (isSplitView && isSynced && videoPlayer2.src) {
        const newTime = videoPlayer1.currentTime + syncTimeOffset;
        videoPlayer2.currentTime = Math.max(0, Math.min(newTime, videoPlayer2.duration));
    }
};

// Speed controls
speedBtns.forEach(btn => {
    btn.onclick = () => {
        const speed = parseFloat(btn.dataset.speed);
        
        // Always set speed for video 1
        videoPlayer1.playbackRate = speed;
        
        // Always set speed for video 2 if it exists
        if (isSplitView && videoPlayer2.src) {
            videoPlayer2.playbackRate = speed;
        }
        
        // Update button state
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        console.log('Playback speed set to:', speed + 'x');
    };
});

// Volume controls
muteBtn.onclick = () => {
    videoPlayer1.muted = !videoPlayer1.muted;
    if (isSplitView && videoPlayer2.src) {
        videoPlayer2.muted = videoPlayer1.muted;
    }
    muteBtn.textContent = videoPlayer1.muted ? '🔇' : '🔊';
    volumeSlider.value = videoPlayer1.muted ? 0 : videoPlayer1.volume * 100;
};

volumeSlider.oninput = () => {
    const volume = volumeSlider.value / 100;
    videoPlayer1.volume = volume;
    if (isSplitView && videoPlayer2.src) {
        videoPlayer2.volume = volume;
    }
    videoPlayer1.muted = volume === 0;
    if (isSplitView && videoPlayer2.src) {
        videoPlayer2.muted = volume === 0;
    }
    muteBtn.textContent = volume === 0 ? '🔇' : '🔊';
};

// Color picker
colorBtns.forEach(btn => {
    btn.onclick = () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColor = btn.dataset.color;
        console.log('Selected color:', currentColor);
    };
});

// Line thickness control
lineThicknessSlider.oninput = () => {
    lineThickness = parseInt(lineThicknessSlider.value);
    thicknessValue.textContent = lineThickness + 'px';
    console.log('Line thickness:', lineThickness);
};

// Text size control
textSizeSlider.oninput = () => {
    textSize = parseInt(textSizeSlider.value);
    textSizeValue.textContent = textSize + 'px';
    console.log('Text size:', textSize);
};

// Annotation tools
toolBtns.forEach(btn => {
    btn.onclick = () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.id.replace('Btn', '');
        anglePoints1 = [];
        anglePoints2 = [];
        canvas1.style.cursor = currentTool ? 'crosshair' : 'default';
        canvas2.style.cursor = currentTool ? 'crosshair' : 'default';
        console.log('Selected tool:', currentTool);
    };
});

clearBtn.onclick = () => {
    ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
    annotations1 = [];
    anglePoints1 = [];
    if (isSplitView) {
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        annotations2 = [];
        anglePoints2 = [];
    }
    console.log('Cleared all annotations');
};

// Get mouse/touch position relative to canvas
function getPointerPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Setup canvas event listeners
function setupCanvasEvents(canvas, canvasNum) {
    canvas.addEventListener('mousedown', (e) => handleDrawStart(e, canvasNum));
    canvas.addEventListener('mousemove', (e) => handleDrawMove(e, canvasNum));
    canvas.addEventListener('mouseup', (e) => handleDrawEnd(e, canvasNum));
    
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            handleDrawStart(e, canvasNum);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            handleDrawMove(e, canvasNum);
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleDrawEnd(e, canvasNum);
    }, { passive: false });
}

setupCanvasEvents(canvas1, 1);
setupCanvasEvents(canvas2, 2);

function handleDrawStart(e, canvasNum) {
    if (!currentTool) {
        console.log('No tool selected');
        return;
    }
    
    activeCanvas = canvasNum;
    const canvas = canvasNum === 1 ? canvas1 : canvas2;
    const annotations = canvasNum === 1 ? annotations1 : annotations2;
    const anglePoints = canvasNum === 1 ? anglePoints1 : anglePoints2;
    const ctx = canvasNum === 1 ? ctx1 : ctx2;
    
    const pos = getPointerPos(e, canvas);
    
    console.log('Draw start at:', pos.x, pos.y, 'on canvas', canvasNum);
    
    // Text tool
    if (currentTool === 'text') {
        let clickedText = null;
        annotations.forEach((ann, index) => {
            if (ann.tool === 'text') {
                ctx.font = (ann.size || textSize) + 'px Arial';
                const textWidth = ctx.measureText(ann.text).width;
                const textHeight = ann.size || textSize;
                if (pos.x >= ann.x && pos.x <= ann.x + textWidth &&
                    pos.y >= ann.y - textHeight && pos.y <= ann.y) {
                    clickedText = index;
                }
            }
        });
        
        if (clickedText !== null) {
            const newText = prompt('Edit text:', annotations[clickedText].text);
            if (newText !== null) {
                if (newText === '') {
                    annotations.splice(clickedText, 1);
                } else {
                    annotations[clickedText].text = newText;
                }
                if (canvasNum === 1) {
                    annotations1 = annotations;
                } else {
                    annotations2 = annotations;
                }
                redrawAnnotations(canvasNum);
            }
        } else {
            const text = prompt('Enter text:');
            if (text) {
                annotations.push({
                    tool: 'text',
                    x: pos.x,
                    y: pos.y,
                    text: text,
                    color: currentColor,
                    size: textSize
                });
                if (canvasNum === 1) {
                    annotations1 = annotations;
                } else {
                    annotations2 = annotations;
                }
                redrawAnnotations(canvasNum);
                console.log('Added text annotation:', text);
            }
        }
        return;
    }
    
    // Angle tool
    if (currentTool === 'angle') {
        anglePoints.push({ x: pos.x, y: pos.y });
        console.log('Angle point', anglePoints.length, ':', pos.x, pos.y);
        
        if (anglePoints.length === 3) {
            const p1 = anglePoints[0];
            const p2 = anglePoints[1];
            const p3 = anglePoints[2];
            
            const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
            const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            let angleDeg = Math.abs((angle2 - angle1) * 180 / Math.PI);
            if (angleDeg > 180) angleDeg = 360 - angleDeg;
            
            annotations.push({
                tool: 'angle',
                p1: p1,
                p2: p2,
                p3: p3,
                angle: angleDeg,
                color: currentColor,
                thickness: lineThickness
            });
            
            if (canvasNum === 1) {
                annotations1 = annotations;
                anglePoints1 = [];
            } else {
                annotations2 = annotations;
                anglePoints2 = [];
            }
            
            redrawAnnotations(canvasNum);
            console.log('Added angle annotation:', angleDeg, '°');
        } else {
            if (canvasNum === 1) {
                anglePoints1 = anglePoints;
            } else {
                anglePoints2 = anglePoints;
            }
            redrawAnnotations(canvasNum);
            ctx.fillStyle = currentColor;
            anglePoints.forEach(pt => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        return;
    }
    
    // Line and Arrow tools
    isDrawing = true;
    startX = pos.x;
    startY = pos.y;
}

function handleDrawMove(e, canvasNum) {
    if (!isDrawing || activeCanvas !== canvasNum) return;
    
    const canvas = canvasNum === 1 ? canvas1 : canvas2;
    const ctx = canvasNum === 1 ? ctx1 : ctx2;
    
    const pos = getPointerPos(e, canvas);
    const currentX = pos.x;
    const currentY = pos.y;
    
    redrawAnnotations(canvasNum);
    
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = lineThickness;
    ctx.beginPath();
    
    if (currentTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (currentTool === 'arrow') {
        drawArrow(ctx, startX, startY, currentX, currentY);
        ctx.stroke();
    }
}

function handleDrawEnd(e, canvasNum) {
    if (!isDrawing || activeCanvas !== canvasNum) return;
    
    const canvas = canvasNum === 1 ? canvas1 : canvas2;
    const annotations = canvasNum === 1 ? annotations1 : annotations2;
    
    const pos = getPointerPos(e, canvas);
    const endX = pos.x;
    const endY = pos.y;
    
    console.log('Draw end at:', endX, endY);
    
    annotations.push({
        tool: currentTool,
        startX,
        startY,
        endX,
        endY,
        color: currentColor,
        thickness: lineThickness
    });
    
    if (canvasNum === 1) {
        annotations1 = annotations;
    } else {
        annotations2 = annotations;
    }
    
    console.log('Added', currentTool, 'annotation to canvas', canvasNum);
    
    redrawAnnotations(canvasNum);
    isDrawing = false;
}

function redrawAnnotations(canvasNum) {
    const canvas = canvasNum === 1 ? canvas1 : canvas2;
    const ctx = canvasNum === 1 ? ctx1 : ctx2;
    const annotations = canvasNum === 1 ? annotations1 : annotations2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    annotations.forEach(ann => {
        ctx.strokeStyle = ann.color || '#2ecc71';
        ctx.fillStyle = ann.color || '#2ecc71';
        ctx.lineWidth = ann.thickness || 5;
        ctx.beginPath();
        
        if (ann.tool === 'line') {
            ctx.moveTo(ann.startX, ann.startY);
            ctx.lineTo(ann.endX, ann.endY);
            ctx.stroke();
        } else if (ann.tool === 'arrow') {
            drawArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY);
            ctx.stroke();
        } else if (ann.tool === 'angle') {
            ctx.moveTo(ann.p1.x, ann.p1.y);
            ctx.lineTo(ann.p2.x, ann.p2.y);
            ctx.lineTo(ann.p3.x, ann.p3.y);
            ctx.stroke();
            
            const radius = 30;
            const angle1 = Math.atan2(ann.p1.y - ann.p2.y, ann.p1.x - ann.p2.x);
            const angle2 = Math.atan2(ann.p3.y - ann.p2.y, ann.p3.x - ann.p2.x);
            
            ctx.beginPath();
            ctx.arc(ann.p2.x, ann.p2.y, radius, angle1, angle2, angle2 < angle1);
            ctx.stroke();
            
            const fontSize = ann.thickness ? ann.thickness * 4 : 20;
            ctx.font = 'bold ' + fontSize + 'px Arial';
            ctx.fillText(Math.round(ann.angle) + '°', ann.p2.x + 40, ann.p2.y - 10);
        } else if (ann.tool === 'text') {
            ctx.font = (ann.size || 32) + 'px Arial';
            ctx.fillText(ann.text, ann.x, ann.y);
        }
    });
}

function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headLength = 20;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Start loading videos when page loads
console.log('Initializing player...');
loadVideos();

// ===== QUICK UPLOAD FUNCTIONALITY =====

const quickUploadBtn = document.getElementById('quickUploadBtn');
const quickUploadInput = document.getElementById('quickUploadInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const uploadStatus = document.getElementById('uploadStatus');

quickUploadBtn.onclick = () => {
    quickUploadInput.click();
};

quickUploadInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid video file (MP4, MOV, AVI)');
        quickUploadInput.value = '';
        return;
    }
    
    // Validate file size (250MB)
    const maxSize = 250 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File is too large. Maximum size is 250MB for 1080p videos.');
        quickUploadInput.value = '';
        return;
    }
    
    // Show progress
    uploadProgress.style.display = 'block';
    quickUploadBtn.disabled = true;
    uploadStatus.textContent = 'Uploading...';
    progressFill.style.width = '0%';
    
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const filename = `video_${timestamp}.${extension}`;
        
        // Upload to Supabase
        const { data, error } = await sb.storage
            .from('coach-videos')
            .upload(filename, file, {
                onUploadProgress: (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    progressFill.style.width = percent + '%';
                    uploadStatus.textContent = `Uploading... ${Math.round(percent)}%`;
                }
            });
        
        if (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            uploadProgress.style.display = 'none';
            quickUploadBtn.disabled = false;
            quickUploadInput.value = '';
            return;
        }
        
        console.log('Upload successful:', data);
        
        // Success state
        uploadStatus.textContent = '✓ Upload complete!';
        progressFill.style.width = '100%';
        progressFill.style.background = '#2ecc71';
        
        // Reload video list
        setTimeout(async () => {
            await loadVideos();
            uploadProgress.style.display = 'none';
            quickUploadBtn.disabled = false;
            quickUploadInput.value = '';
            progressFill.style.width = '0%';
            progressFill.style.background = '#2ecc71';
        }, 1500);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
        uploadProgress.style.display = 'none';
        quickUploadBtn.disabled = false;
        quickUploadInput.value = '';
    }
};