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
    $('#ai-form').on('submit', function (e) {
        e.preventDefault();
        const prompt = $('#ai-prompt').val().trim();
        if (!prompt) return;

        $('#ai-answer').text('Думаю...');

        $.ajax({
            url: '/ai_request',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        })
        .done(function (res) {
            $('#ai-answer').text(res.answer || '');
        })
        .fail(function () {
            $('#ai-answer').text('Ошибка запроса');
        });
    });
});