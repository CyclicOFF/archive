$(document).ready(function () {

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
    $('#ai-form').on('submit', function (e) {
        e.preventDefault();

        const prompt = $('#ai-prompt').val().trim();
        if (!prompt) return;

        const $btn = $('#ask-btn');
        const $answerContainer = $('#ai-answer-container');
        const $answer = $('#ai-answer');
        const $emptyState = $('#ai-empty-state');
        const $loader = $('#ai-loader');

        // UI state: loading
        $btn.prop('disabled', true);
        $emptyState.addClass('hidden');
        $answerContainer.addClass('hidden');
        $loader.removeClass('hidden');

        $.ajax({
            url: '/ai_request',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        })
        .done(function (res) {
            // Render Markdown
            if (typeof marked !== 'undefined') {
                $answer.html(marked.parse(res.answer || ''));
            } else {
                $answer.text(res.answer || '');
            }
            
            $answer.removeClass('bg-red-50 border-red-200 text-red-800').addClass('bg-gray-50 border-gray-100 text-gray-800');
            $answerContainer.removeClass('hidden');

            if (typeof res.balance !== 'undefined') {
                $('#balance-value').text(res.balance);
            }
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Ошибка запроса';
            
            $answer.text(msg);
            $answer.removeClass('bg-gray-50 border-gray-100 text-gray-800').addClass('bg-red-50 border-red-200 text-red-800');
            $answerContainer.removeClass('hidden');
            
            Toast.fire({ icon: 'error', title: 'Упс! Произошла ошибка' });

            if (xhr.responseJSON && typeof xhr.responseJSON.balance !== 'undefined') {
                $('#balance-value').text(xhr.responseJSON.balance);
            }
        })
        .always(function () {
            $loader.addClass('hidden');
            $btn.prop('disabled', false);
            // Clear input text to easily ask next question
            $('#ai-prompt').val('');
        });
    });
});