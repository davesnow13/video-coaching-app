// ⚠️ REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://mpsizlkawqxfrdsuhizj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc2l6bGthd3F4ZnJkc3VoaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzMzNTcsImV4cCI6MjA5MDgwOTM1N30.87hhI6d-FmXAuehwV4ciVFX3En1G2x3fCUYPpAIS5c8';

// Initialize Supabase
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadBtn = document.getElementById('uploadBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const message = document.getElementById('message');

let selectedFile = null;

// Click to select file
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.startsWith('video/')) {
        showMessage('Please select a video file', 'error');
        return;
    }
    
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage('Video is too large. Please use a file under 100 MB', 'error');
        return;
    }
    
    selectedFile = file;
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.add('show');
    uploadBtn.disabled = false;
    
    message.classList.remove('show');
}

// Upload button click
uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    uploadBtn.disabled = true;
    progressBar.classList.add('show');
    message.classList.remove('show');
    
    try {
        const timestamp = Date.now();
        const fileExtension = selectedFile.name.split('.').pop();
        const uploadFileName = `video_${timestamp}.${fileExtension}`;
        
        const { data, error } = await sb.storage
            .from('coach-videos')
            .upload(uploadFileName, selectedFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            throw error;
        }
        
        progressFill.style.width = '100%';
        showMessage('✅ Video uploaded successfully!', 'success');
        
        setTimeout(() => {
            resetForm();
        }, 3000);
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload failed: ' + error.message, 'error');
        uploadBtn.disabled = false;
    }
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message show ' + type;
}

function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.remove('show');
    uploadBtn.disabled = true;
    progressBar.classList.remove('show');
    progressFill.style.width = '0%';
    message.classList.remove('show');
}