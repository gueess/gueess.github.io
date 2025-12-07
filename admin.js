// 配置
const CONFIG = {
    API_KEY: 'c92de85034e01668a7ccc9ba0eb95d41',
    API_URL: 'https://postimages.org/api/upload',
    CONFIG_FILE: 'admin-config.json'
};

// 注意：postimg.cc API 可能需要不同的参数格式
// 如果上传失败，可能需要调整 formData 的参数名称

// 全局状态
let state = {
    photos: [],
    currentAlbum: {
        title: '',
        filename: '',
        layout: []
    },
    isAuthenticated: false
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initPasswordAuth();
    initUpload();
    initLayoutEditor();
    initPreview();
    loadConfig();
});

// ==================== 密码保护 ====================
function initPasswordAuth() {
    const passwordScreen = document.getElementById('password-screen');
    const adminContainer = document.getElementById('admin-container');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const setPasswordForm = document.getElementById('set-password-form');
    const passwordForm = document.getElementById('password-form');
    const newPasswordInput = document.getElementById('new-password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const setPasswordSubmit = document.getElementById('set-password-submit');
    const passwordError = document.getElementById('password-error');
    const logoutBtn = document.getElementById('logout-btn');

    // 检查是否已设置密码
    const storedPassword = localStorage.getItem('admin_password');
    if (!storedPassword) {
        passwordForm.style.display = 'none';
        setPasswordForm.style.display = 'block';
    }

    // 设置密码
    setPasswordSubmit.addEventListener('click', () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!newPassword) {
            passwordError.textContent = '请输入密码';
            return;
        }

        if (newPassword !== confirmPassword) {
            passwordError.textContent = '两次输入的密码不一致';
            return;
        }

        localStorage.setItem('admin_password', newPassword);
        passwordScreen.style.display = 'none';
        adminContainer.style.display = 'block';
        state.isAuthenticated = true;
    });

    // 登录
    passwordSubmit.addEventListener('click', () => {
        const password = passwordInput.value;
        const storedPassword = localStorage.getItem('admin_password');

        if (!storedPassword) {
            passwordForm.style.display = 'none';
            setPasswordForm.style.display = 'block';
            return;
        }

        if (password === storedPassword) {
            passwordScreen.style.display = 'none';
            adminContainer.style.display = 'block';
            state.isAuthenticated = true;
        } else {
            passwordError.textContent = '密码错误';
        }
    });

    // 回车登录
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordSubmit.click();
        }
    });

    newPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setPasswordSubmit.click();
        }
    });

    confirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setPasswordSubmit.click();
        }
    });

    // 退出登录
    logoutBtn.addEventListener('click', () => {
        if (confirm('确定要退出吗？')) {
            passwordScreen.style.display = 'flex';
            adminContainer.style.display = 'none';
            state.isAuthenticated = false;
            passwordInput.value = '';
            passwordError.textContent = '';
        }
    });
}

// ==================== 照片上传 ====================
function initUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const uploadProgress = document.getElementById('upload-progress');

    // 点击选择文件
    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.tagName === 'P') {
            fileInput.click();
        }
    });

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });

    // 拖拽上传
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
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleFiles(files);
    });
}

async function handleFiles(files) {
    const uploadProgress = document.getElementById('upload-progress');
    
    for (const file of files) {
        const uploadItem = document.createElement('div');
        uploadItem.className = 'upload-item';
        uploadItem.innerHTML = `
            <span>${file.name}</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        `;
        uploadProgress.appendChild(uploadItem);

        try {
            const photo = await uploadToPostimg(file, (progress) => {
                const progressFill = uploadItem.querySelector('.progress-fill');
                progressFill.style.width = progress + '%';
            });

            state.photos.push(photo);
            renderPhotoLibrary();
            uploadItem.remove();
        } catch (error) {
            console.error('上传失败:', error);
            uploadItem.innerHTML = `<span style="color: #e74c3c;">${file.name} - 上传失败</span>`;
        }
    }
}

async function uploadToPostimg(file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('upload', file);
        formData.append('token', CONFIG.API_KEY);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    // Postimg.cc API 可能返回不同的格式，尝试多种可能的响应格式
                    let imageUrl = null;
                    
                    if (response.status === 200 && response.url) {
                        imageUrl = response.url;
                    } else if (response.url) {
                        imageUrl = response.url;
                    } else if (response.image) {
                        imageUrl = response.image.url || response.image;
                    } else if (response.data && response.data.url) {
                        imageUrl = response.data.url;
                    }
                    
                    if (imageUrl) {
                        // 确保 URL 是完整的
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = 'https://' + imageUrl.replace(/^\/\//, '');
                        }
                        
                        const photo = {
                            id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                            url: imageUrl,
                            thumbnail: imageUrl,
                            uploadedAt: new Date().toISOString(),
                            filename: file.name
                        };
                        resolve(photo);
                    } else {
                        console.error('API 响应:', response);
                        reject(new Error('无法从响应中获取图片 URL'));
                    }
                } catch (e) {
                    console.error('解析响应失败:', e, xhr.responseText);
                    reject(new Error('解析响应失败: ' + e.message));
                }
            } else {
                reject(new Error('上传失败: HTTP ' + xhr.status));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });

        // 尝试使用正确的 API 端点
        xhr.open('POST', 'https://postimages.org/api/upload');
        xhr.send(formData);
    });
}

// ==================== 照片库 ====================
function renderPhotoLibrary() {
    const photoLibrary = document.getElementById('photo-library');
    
    if (state.photos.length === 0) {
        photoLibrary.innerHTML = '<p class="empty-message">暂无照片，请先上传</p>';
        return;
    }

    photoLibrary.innerHTML = state.photos.map(photo => `
        <div class="photo-item" draggable="true" data-photo-id="${photo.id}">
            <img src="${photo.thumbnail}" alt="${photo.filename}">
            <button class="delete-btn" onclick="deletePhoto('${photo.id}')">×</button>
        </div>
    `).join('');

    // 添加拖拽事件
    photoLibrary.querySelectorAll('.photo-item').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
    });
}

function deletePhoto(photoId) {
    if (confirm('确定要删除这张照片吗？')) {
        state.photos = state.photos.filter(p => p.id !== photoId);
        // 同时从布局中移除
        state.currentAlbum.layout.forEach(row => {
            row.photos = row.photos.filter(url => {
                const photo = state.photos.find(p => p.url === url);
                return photo !== undefined;
            });
        });
        renderPhotoLibrary();
        renderLayoutEditor();
        renderPreview();
    }
}

// ==================== 布局编辑器 ====================
function initLayoutEditor() {
    const templateBtns = document.querySelectorAll('.template-btn');
    
    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            addLayoutRow(type);
        });
    });

    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    document.getElementById('publish-btn').addEventListener('click', publishPage);
}

function addLayoutRow(type) {
    const row = {
        id: 'row-' + Date.now(),
        type: type,
        photos: []
    };

    // 根据类型初始化照片数组
    if (type === 'row-3') {
        row.photos = ['', '', ''];
    } else if (type === 'row-2') {
        row.photos = ['', ''];
    } else if (type === 'row-1') {
        row.photos = [''];
    }

    state.currentAlbum.layout.push(row);
    renderLayoutEditor();
    renderPreview();
}

function renderLayoutEditor() {
    const layoutEditor = document.getElementById('layout-editor');
    
    if (state.currentAlbum.layout.length === 0) {
        layoutEditor.innerHTML = '<p class="empty-message">点击上方按钮添加布局行</p>';
        return;
    }

    layoutEditor.innerHTML = state.currentAlbum.layout.map((row, index) => `
        <div class="layout-row ${row.type}">
            <div class="layout-row-header">
                <span class="row-type">${getRowTypeName(row.type)}</span>
                <button class="delete-row-btn" onclick="deleteLayoutRow(${index})">删除</button>
            </div>
            ${row.photos.map((photoUrl, slotIndex) => `
                <div class="slot ${photoUrl ? 'has-photo' : ''}" 
                     data-row-index="${index}" 
                     data-slot-index="${slotIndex}"
                     ondrop="handleDrop(event)" 
                     ondragover="handleDragOver(event)"
                     ondragleave="handleDragLeave(event)">
                    ${photoUrl ? `<img src="${photoUrl}" alt="Photo">` : '<div class="slot-placeholder">拖拽照片到这里</div>'}
                </div>
            `).join('')}
        </div>
    `).join('');
}

function getRowTypeName(type) {
    const names = {
        'row-3': '一排三个',
        'row-2': '一排两个',
        'row-1': '一排一个'
    };
    return names[type] || type;
}

function deleteLayoutRow(index) {
    if (confirm('确定要删除这一行吗？')) {
        state.currentAlbum.layout.splice(index, 1);
        renderLayoutEditor();
        renderPreview();
    }
}

// ==================== 拖拽功能 ====================
let draggedPhotoId = null;

function handleDragStart(e) {
    draggedPhotoId = e.target.closest('.photo-item').dataset.photoId;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedPhotoId) return;

    const photo = state.photos.find(p => p.id === draggedPhotoId);
    if (!photo) return;

    const rowIndex = parseInt(e.currentTarget.dataset.rowIndex);
    const slotIndex = parseInt(e.currentTarget.dataset.slotIndex);

    state.currentAlbum.layout[rowIndex].photos[slotIndex] = photo.url;
    
    renderLayoutEditor();
    renderPreview();
    draggedPhotoId = null;
}

// ==================== 预览功能 ====================
function initPreview() {
    const titleInput = document.getElementById('album-title-input');
    const filenameInput = document.getElementById('album-filename-input');

    titleInput.addEventListener('input', (e) => {
        state.currentAlbum.title = e.target.value;
        renderPreview();
    });

    filenameInput.addEventListener('input', (e) => {
        state.currentAlbum.filename = e.target.value;
    });
}

function renderPreview() {
    const previewContainer = document.getElementById('preview-container');
    
    if (state.currentAlbum.layout.length === 0) {
        previewContainer.innerHTML = '<p class="empty-message">添加照片后预览效果</p>';
        return;
    }

    // 生成预览 HTML
    const previewHTML = generatePreviewHTML();
    
    // 创建 blob URL
    const blob = new Blob([previewHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    previewContainer.innerHTML = `<iframe src="${url}"></iframe>`;
}

function generatePreviewHTML() {
    const title = state.currentAlbum.title || '相册';
    
    let layoutHTML = '';
    
    state.currentAlbum.layout.forEach(row => {
        if (row.type === 'row-3') {
            layoutHTML += '<div class="top-row">';
            row.photos.forEach(url => {
                if (url) {
                    layoutHTML += `<div class="top-image" style="background-image: url('${url}');"></div>`;
                } else {
                    layoutHTML += '<div class="top-image" style="background-color: #ddd;"></div>';
                }
            });
            layoutHTML += '</div>';
        } else if (row.type === 'row-2') {
            layoutHTML += '<div class="bottom-images">';
            row.photos.forEach(url => {
                if (url) {
                    layoutHTML += `<div class="bottom-image" style="background-image: url('${url}');"></div>`;
                } else {
                    layoutHTML += '<div class="bottom-image" style="background-color: #ddd;"></div>';
                }
            });
            layoutHTML += '</div>';
        } else if (row.type === 'row-1') {
            row.photos.forEach(url => {
                if (url) {
                    layoutHTML += `<div class="single-photo-container"><div class="single-photo" style="background-image: url('${url}');"></div></div>`;
                } else {
                    layoutHTML += '<div class="single-photo-container"><div class="single-photo" style="background-color: #ddd;"></div></div>';
                }
            });
        }
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: Arial, sans-serif;
        }
        #gallery-container {
            height: 100vh;
            overflow-y: auto;
            position: relative;
        }
        .gallery {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            padding-top: 60px;
        }
        .top-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .top-image {
            width: 32%;
            height: 0;
            padding-bottom: 48%;
            background-color: #dddddd;
            background-size: cover;
            background-position: center;
        }
        .bottom-images {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
        }
        .bottom-image {
            width: 49%;
            height: 0;
            padding-bottom: 32.67%;
            background-color: #ddd;
            background-size: cover;
            background-position: center;
            margin-bottom: 20px;
        }
        .single-photo-container {
            width: 100%;
            margin-bottom: 20px;
        }
        .single-photo {
            width: 100%;
            height: 0;
            padding-bottom: 66.67%;
            background-color: #ddd;
            background-size: cover;
            background-position: center;
        }
        .header {
            position: fixed;
            top: 0;
            background: #333;
            color: #fff;
            width: 100%;
            text-align: center;
            padding: 5px 0;
            z-index: 1;
            transition: top 0.3s;
        }
    </style>
</head>
<body>
    <div class="gallery-container" id="gallery-container">
        <div class="header" id="header">
            <h1>${title}</h1>
        </div>
        <div class="gallery">
            ${layoutHTML}
        </div>
    </div>
    <script>
        let lastScrollTop = 0;
        const header = document.getElementById('header');
        const galleryContainer = document.getElementById('gallery-container');
        const headerHeight = header.offsetHeight;

        galleryContainer.addEventListener('scroll', () => {
            const scrollTop = galleryContainer.scrollTop;
            if (scrollTop > lastScrollTop) {
                header.style.top = '-120px';
                if (scrollTop <= 0) {
                    header.style.top = '0';
                }
            }
            else if(scrollTop < lastScrollTop){
                header.style.top = '-120px';
                if (scrollTop + galleryContainer.clientHeight + headerHeight >= galleryContainer.scrollHeight) {
                    header.style.top = '0';
                }
                if (scrollTop <= 0) {
                    header.style.top = '0';
                }
            }
            lastScrollTop = scrollTop;
        });
    </script>
</body>
</html>`;
}

// ==================== 配置保存和加载 ====================
function saveConfig() {
    const config = {
        photos: state.photos,
        albums: [{
            id: 'current',
            title: state.currentAlbum.title,
            filename: state.currentAlbum.filename,
            layout: state.currentAlbum.layout
        }]
    };

    // 保存到 localStorage（临时方案，实际应该保存到文件）
    localStorage.setItem('admin_config', JSON.stringify(config));
    
    // 尝试保存到文件（需要后端支持，这里先提示）
    alert('配置已保存到浏览器本地存储。\n\n注意：由于浏览器安全限制，无法直接保存到文件。\n请使用"发布页面"功能生成 HTML 文件。');
}

function loadConfig() {
    const savedConfig = localStorage.getItem('admin_config');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            if (config.photos) {
                state.photos = config.photos;
                renderPhotoLibrary();
            }
            if (config.albums && config.albums.length > 0) {
                const album = config.albums[0];
                state.currentAlbum.title = album.title || '';
                state.currentAlbum.filename = album.filename || '';
                state.currentAlbum.layout = album.layout || [];
                
                document.getElementById('album-title-input').value = state.currentAlbum.title;
                document.getElementById('album-filename-input').value = state.currentAlbum.filename;
                
                renderLayoutEditor();
                renderPreview();
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

// ==================== 发布页面 ====================
function publishPage() {
    const filename = state.currentAlbum.filename || 'photo-new.html';
    
    if (!filename.endsWith('.html')) {
        alert('文件名必须以 .html 结尾');
        return;
    }

    if (state.currentAlbum.layout.length === 0) {
        alert('请先添加布局和照片');
        return;
    }

    const html = generatePreviewHTML();
    
    // 创建下载链接
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // 同时保存配置
    saveConfig();
    
    alert(`页面已生成并下载：${filename}\n\n请将文件上传到 GitHub 仓库。`);
}

