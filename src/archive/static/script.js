$(document).ready(function () {

    function getSwalOpts(extra) {
        const themeConfig = window.getSwalThemeConfig ? window.getSwalThemeConfig() : {};
        return Object.assign({}, themeConfig, extra);
    }

    // Helper for Toast notifications
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    function showToast(icon, title) {
        const themeConfig = window.getSwalThemeConfig ? window.getSwalThemeConfig() : {};
        Toast.fire(Object.assign({}, themeConfig, { icon: icon, title: title }));
    }

    // ---------- РЕГИСТРАЦИЯ ----------
    $('#register-form').on('submit', function (e) {
        e.preventDefault();

        const pass     = $('#password').val();
        const passConf = $('#confirm_password').val();

        if (pass !== passConf) {
            Toast.fire({ icon: 'error', title: 'Пароли не совпадают' });
            return;
        }
        if (pass.length < 6) {
            Toast.fire({ icon: 'error', title: 'Пароль должен быть не короче 6 символов' });
            return;
        }

        $.ajax({
            url: '/user_register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                name:     $('#fullname').val(),
                lastname: $('#lastname').val(),
                email:    $('#email').val(),
                password: pass
            })
        })
        .done(function (res) {
            Toast.fire({ icon: 'success', title: 'Регистрация успешна!' });
            setTimeout(() => {
                if (res.redirect) window.location.href = res.redirect;
            }, 1000);
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Ошибка регистрации';
            Toast.fire({ icon: 'error', title: msg });
        });
    });

    // ---------- АВТОРИЗАЦИЯ ----------
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        $.ajax({
            url: '/user_login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email:    $('#email').val(),
                password: $('#password').val()
            })
        })
        .done(function (res) {
            if (res.redirect) window.location.href = res.redirect;
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Ошибка входа';
            Toast.fire({ icon: 'error', title: msg });
        });
    });

    // ---------- КНОПКА "ОТДАТЬ ДЕНЬГИ" ----------
    $('#send-money-btn').on('click', function () {
        Swal.fire({
            title: 'В разработке',
            text: 'Функция перевода денег появится в следующих обновлениях!',
            icon: 'info',
            confirmButtonText: 'Понятно',
            confirmButtonColor: '#3085d6'
        });
    });

    // ---------- ЗАПРОС К НЕЙРОСЕТИ ----------
    const $chatContainer = $('#chat-container');
    const $aiForm = $('#ai-form');
    
    // Auto-resize textarea
    $('#ai-prompt').on('input', function() {
        this.style.height = '50px';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Submit on Enter (without Shift)
    $('#ai-prompt').on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $('#ai-form').submit();
        }
    });

    function appendMessage(role, content) {
        $('#ai-empty-state').addClass('hidden');
        const templateId = role === 'user' ? '#msg-user' : '#msg-ai';
        const $msg = $($(templateId).html());
        
        if (role === 'user') {
            $msg.find('.content').text(content);
        } else {
            $msg.find('.content').html(marked.parse(content || ''));
        }
        
        $chatContainer.append($msg);
        $chatContainer.scrollTop($chatContainer[0].scrollHeight);
    }

    // Load history
    if ($chatContainer.length > 0) {
        $.get('/api/ai_history').done(function(res) {
            if (res.history && res.history.length > 0) {
                res.history.forEach(msg => {
                    appendMessage(msg.role, msg.content);
                });
            }
        });
    }

    // Очистка истории чата
    $('#clear-chat-btn').on('click', function () {
        Swal.fire(getSwalOpts({
            title: 'Очистить историю?',
            text: 'Все сообщения будут удалены без возможности восстановления.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Да, очистить',
            cancelButtonText: 'Отмена'
        })).then((result) => {
            if (result.isConfirmed) {
                $.post('/api/ai_clear')
                .done(function () {
                    $chatContainer.empty();
                    $chatContainer.append(`
                        <div id="ai-empty-state" class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-80">
                            <div class="w-16 h-16 bg-white/50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-white dark:border-slate-700">
                                <span class="text-3xl">✨</span>
                            </div>
                            <p class="font-medium text-sm sm:text-base">История чиста. Задайте первый вопрос!</p>
                        </div>
                    `);
                    showToast('success', 'История очищена');
                })
                .fail(function () {
                    showToast('error', 'Ошибка при очистке истории');
                });
            }
        });
    });

    $aiForm.on('submit', function (e) {
        e.preventDefault();

        const $promptInput = $('#ai-prompt');
        const prompt = $promptInput.val().trim();
        if (!prompt) return;

        const $btn = $('#ask-btn');
        const $loader = $('#ai-loader');

        // Show user message immediately
        appendMessage('user', prompt);
        
        // Reset input
        $promptInput.val('');
        $promptInput.css('height', '50px');
        
        // UI state: loading
        $btn.prop('disabled', true);
        $loader.removeClass('hidden');
        $chatContainer.scrollTop($chatContainer[0].scrollHeight);

        $.ajax({
            url: '/ai_request',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        })
        .done(function (res) {
            appendMessage('assistant', res.answer);
            if (typeof res.balance !== 'undefined') {
                $('#balance-value').text(res.balance);
            }
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Ошибка запроса';
            appendMessage('assistant', '❌ **Ошибка:** ' + msg);
            
            if (xhr.responseJSON && typeof xhr.responseJSON.balance !== 'undefined') {
                $('#balance-value').text(xhr.responseJSON.balance);
            }
        })
        .always(function () {
            $loader.addClass('hidden');
            $btn.prop('disabled', false);
            $promptInput.focus();
        });
    });
});