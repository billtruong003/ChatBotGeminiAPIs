document.addEventListener('DOMContentLoaded', function () {
    const messagesDiv = document.getElementById('messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const recordButton = document.getElementById('record-button');

    let mediaRecorder;
    let audioChunks = [];

    // Kiểm tra và xác minh rằng marked đã được tải
    function ensureMarkedLoaded() {
        if (typeof marked !== 'function') {
            console.error('marked is not loaded or not a function');
            return false;
        }
        console.log('marked is loaded successfully');
        return true;
    }

    // Hàm thêm tin nhắn vào giao diện
    function addMessage(sender, message, isMarkdown = false, isMedia = false) {
        const messageElement = document.createElement('div');
        const messageBubble = document.createElement('div');

        if (isMedia) {
            messageBubble.innerHTML = message;
        } else {
            if (isMarkdown && ensureMarkedLoaded()) {
                messageBubble.innerHTML = marked.parse(message);
            } else {
                messageBubble.innerHTML = processMessage(message);
            }
        }

        messageBubble.className = 'message-bubble';

        if (sender.toLowerCase() === 'you') {
            messageElement.className = 'message user-message';
            messageBubble.classList.add('user-bubble');
        } else {
            messageElement.className = 'message bot-message';
        }

        messageElement.appendChild(messageBubble);
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Hàm xử lý Markdown
    function processMessage(message) {
        message = processLinks(message);
        message = processFiles(message);
        message = processImages(message);
        message = processVideos(message);
        return handleCode(message);
    }

    // Hàm xử lý liên kết
    function processLinks(message) {
        return message.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    // Hàm xử lý tệp
    function processFiles(message) {
        return message.replace(/\[file: (.+?)]/g, '<a href="$1" target="_blank">Download File</a>');
    }

    // Hàm xử lý hình ảnh
    function processImages(message) {
        return message.replace(/\[img: (.+?)]/g, '<img src="$1" alt="Image" style="max-width: 100%; border-radius: 8px;">');
    }

    // Hàm xử lý video
    function processVideos(message) {
        return message.replace(/\[video: (.+?)]/g, '<video controls src="$1" style="max-width: 100%; border-radius: 8px;"></video>');
    }

    // Hàm xử lý mã
    function handleCode(message) {
        return message.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
    }

    // Hàm thoát các ký tự HTML đặc biệt để ngăn XSS
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Hàm sao chép nội dung vào clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard');
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }

    // Hàm gửi tin nhắn và xử lý phản hồi
    async function sendMessage(message) {
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyDLZulonQabTbT20sWi0lg4NQ-rdqQWj9o';
        const headers = {
            'Content-Type': 'application/json'
        };
        const data = {
            contents: [{
                parts: [{
                    text: message
                }]
            }]
        };

        // Hiển thị hiệu ứng "texting" khi chờ phản hồi
        const loaderId = `loader-${Date.now()}`;
        addMessage('BillGemini', `<div id="${loaderId}" class="loader"><div></div><div></div><div></div></div>`, false, true);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            // Xóa loader khi nhận được phản hồi
            const loaderElement = document.getElementById(loaderId);
            if (loaderElement) loaderElement.remove();

            if (!response.ok) {
                handleError(response.status);
                return;
            }

            const responseData = await response.json();
            if (responseData && responseData.candidates && responseData.candidates.length > 0) {
                const reply = responseData.candidates[0].content.parts[0].text;
                addMessage('BillGemini', reply, containsMarkdown(reply), containsCode(reply));
            } else {
                addMessage('BillGemini', 'No response received from the API.');
            }

        } catch (error) {
            console.error('Error:', error);
            addMessage('BillGemini', `Sorry, I encountered an error: ${error.message}`);
        }
    }

    // Hàm xử lý lỗi từ phản hồi HTTP
    function handleError(status) {
        let errorDetail = `HTTP error! status: ${status}`;
        if (status === 401) {
            errorDetail = 'Unauthorized! Please check your API key.';
        } else if (status === 404) {
            errorDetail = 'Not Found! Please check the API URL.';
        }
        addMessage('BillGemini', errorDetail);
    }

    // Kiểm tra xem tin nhắn có chứa mã code hay không
    function containsCode(message) {
        return /```([\s\S]+?)```/.test(message);
    }

    // Kiểm tra xem tin nhắn có chứa cú pháp Markdown hay không
    function containsMarkdown(message) {
        return /[*#`]/.test(message);
    }

    // Bắt sự kiện click nút gửi
    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            addMessage('You', message, containsMarkdown(message));
            sendMessage(message);
            userInput.value = '';
        }
    });

    // Bắt sự kiện nhấn phím Enter
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Ngăn chặn hành vi mặc định
            const message = userInput.value.trim();
            if (message) {
                addMessage('You', message, containsMarkdown(message));
                sendMessage(message);
                userInput.value = '';
            }
        }
    });

    // Bắt sự kiện cho upload tệp
    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                let content;
                if (file.type.startsWith('image/')) {
                    content = `<img src="${reader.result}" alt="Image" style="max-width: 100%; border-radius: 8px;">`;
                } else if (file.type.startsWith('video/')) {
                    content = `<video controls src="${reader.result}" style="max-width: 100%; border-radius: 8px;"></video>`;
                } else if (file.type.startsWith('audio/')) {
                    content = `<audio controls src="${reader.result}" style="width: 100%;"></audio>`;
                } else {
                    content = `[file: ${reader.result}]`;
                }
                addMessage('You', content, false, true);
            };
            reader.readAsDataURL(file);
        }
    });

    // Hàm khởi động ghi âm
    function startRecording() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.ondataavailable = e => {
                        audioChunks.push(e.data);
                        if (mediaRecorder.state === 'inactive') {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                            const audioUrl = URL.createObjectURL(audioBlob);
                            const audio = `<audio controls src="${audioUrl}" style="width: 100%;"></audio>`;
                            addMessage('You', audio, false, true);
                        }
                    };
                    mediaRecorder.start();
                })
                .catch(err => {
                    console.error('Error accessing microphone: ', err);
                });
        } else {
            alert('Microphone not supported in this browser');
        }
    }

    // Hàm dừng ghi âm
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    // Bắt sự kiện cho nút ghi âm
    recordButton.addEventListener('mousedown', startRecording);
    recordButton.addEventListener('mouseup', stopRecording);
    recordButton.addEventListener('touchstart', startRecording);
    recordButton.addEventListener('touchend', stopRecording);
});
