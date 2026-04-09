// Supabase Configuration
const SUPABASE_URL = 'https://mpsizlkawqxfrdsuhizj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc2l6bGthd3F4ZnJkc3VoaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzMzNTcsImV4cCI6MjA5MDgwOTM1N30.87hhI6d-FmXAuehwV4ciVFX3En1G2x3fCUYPpAIS5c8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadButton = document.getElementById('uploadButton');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const message = document.getElementById('message');

let selectedFile = null;

// Click to upload
uploadArea.onclick = () => {
    fileInput.click();
};

// Drag and drop
uploadArea.ondragover = (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
};

uploadArea.ondragleave = () => {
    uploadArea.classList.remove('dragover');
};

uploadArea.ondrop = (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
};

// File input change
fileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
};

// Handle file selection
function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (!validTypes.includes(file.type)) {
        showMessage('Please select a valid video file (MP4, MOV, AVI)', 'error');
        return;
    }

    // Validate file size (250MB)
    const maxSize = 250 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage('File is too large. Maximum size is 250MB for 1080p videos.', 'error');
        return;
    }

    selectedFile = file;

    // Display file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.add('show');
    uploadButton.classList.add('show');

    // Hide previous messages
    message.classList.remove('show');
}

// Upload button click
uploadButton.onclick = async () => {
    if (!selectedFile) return;

    uploadButton.disabled = true;
    progressContainer.classList.add('show');
    message.classList.remove('show');

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const extension = selectedFile.name.split('.').pop();
        const filename = `video_${timestamp}.${extension}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from('coach-videos')
            .upload(filename, selectedFile, {
                onUploadProgress: (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    progressFill.style.width = percent + '%';
                    progressText.textContent = `Uploading... ${Math.round(percent)}%`;
                }
            });

        if (error) {
            console.error('Upload error:', error);
            showMessage('Upload failed: ' + error.message, 'error');
            uploadButton.disabled = false;
            progressContainer.classList.remove('show');
            return;
        }

        console.log('Upload successful:', data);

        // Success
        showMessage('✓ Video uploaded successfully!', 'success');
        progressText.textContent = 'Upload complete!';

        // Reset form after 2 seconds
        setTimeout(() => {
            resetForm();
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload failed: ' + error.message, 'error');
        uploadButton.disabled = false;
        progressContainer.classList.remove('show');
    }
};

// Show message
function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message show ' + type;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Reset form
function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.remove('show');
    uploadButton.classList.remove('show');
    uploadButton.disabled = false;
    progressContainer.classList.remove('show');
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';
}