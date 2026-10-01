$(document).ready(function () {

    // ---------- РЕГИСТРАЦИЯ ----------
    $('#register-form').on('submit', function (e) {
        e.preventDefault();

        const pass     = $('#password').val();
        const passConf = $('#confirm_password').val();

        if (pass !== passConf) {
            alert('Пароли не совпадают');
            return;
        }
        if (pass.length < 6) {
            alert('Пароль должен быть не короче 6 символов');
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
            if (res.redirect) window.location.href = res.redirect;
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                        || 'Ошибка регистрации';
            alert(msg);
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
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                        || 'Ошибка входа';
            alert(msg);
        });
    });

    // ---------- КНОПКА "ОТДАТЬ ДЕНЬГИ" (визуал) ----------
    $('#send-money-btn').on('click', function () {
        alert('Функция перевода денег пока в разработке');
    });

    // ---------- ЗАПРОС К НЕЙРОСЕТИ ----------
    // ---------- ЗАПРОС К НЕЙРОСЕТИ ----------
    $('#ai-form').on('submit', function (e) {
        e.preventDefault();

        const prompt = $('#ai-prompt').val().trim();
        if (!prompt) return;

        const $btn    = $('#ask-btn');
        const $answer = $('#ai-answer');

        $btn.prop('disabled', true);
        $answer.removeClass('error').text('Думаю...');

        $.ajax({
            url: '/ai_request',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        })
        .done(function (res) {
            $answer.text(res.answer || '');
            // Обновляем баланс, не перезагружая страницу
            if (typeof res.balance !== 'undefined') {
                $('#balance-value').text(res.balance);
            }
        })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                        || 'Ошибка запроса';
            $answer.addClass('error').text(msg);

            // Если сервер вернул актуальный баланс — покажем его
            if (xhr.responseJSON && typeof xhr.responseJSON.balance !== 'undefined') {
                $('#balance-value').text(xhr.responseJSON.balance);
            }
        })
        .always(function () {
            $btn.prop('disabled', false);
        });
    });
});