$(document).ready(function () {

    function getSwalOpts(extra) {
        const themeConfig = window.getSwalThemeConfig ? window.getSwalThemeConfig() : {};
        return Object.assign({}, themeConfig, extra);
    }

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    function showToast(icon, title) {
        const themeConfig = window.getSwalThemeConfig ? window.getSwalThemeConfig() : {};
        Toast.fire(Object.assign({}, themeConfig, { icon: icon, title: title }));
    }

    function postJSON(url, data, onSuccess, onError) {
        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data || {})
        })
        .done(function (res) { onSuccess && onSuccess(res); })
        .fail(function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Ошибка запроса';
            showToast('error', msg);
            onError && onError(xhr);
        });
    }

    // --- Сохранить баланс ---
    $(document).on('click', '[data-action="save-balance"]', function () {
        const $row  = $(this).closest('tr');
        const id    = $row.data('user-id');
        const value = parseInt($row.find('[data-balance-input]').val(), 10);

        if (isNaN(value) || value < 0) {
            showToast('warning', 'Баланс должен быть целым неотрицательным числом');
            return;
        }

        postJSON(`/admin/user/${id}/balance`, { balance: value }, function (res) {
            $row.find('[data-balance-input]').val(res.balance);
            showToast('success', 'Баланс обновлен');
            flashRow($row, 'bg-green-100 dark:bg-green-950/40');
        });
    });

    // --- Назначить/снять админа ---
    $(document).on('click', '[data-action="toggle-admin"]', function () {
        const $row = $(this).closest('tr');
        const id   = $row.data('user-id');
        const $btn = $(this);

        $btn.prop('disabled', true);
        postJSON(`/admin/user/${id}/toggle_admin`, {}, function (res) {
            const isAdmin = res.is_admin === 1;
            const $badge  = $row.find('[data-role-badge]');
            
            if (isAdmin) {
                $badge.text('Администратор')
                      .removeClass('bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300')
                      .addClass('bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300');
                $btn.text('Разжаловать')
                    .removeClass('border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40')
                    .addClass('border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40');
            } else {
                $badge.text('Пользователь')
                      .removeClass('bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300')
                      .addClass('bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300');
                $btn.text('В админы')
                    .removeClass('border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40')
                    .addClass('border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40');
            }
            
            showToast('success', 'Роль изменена');
            flashRow($row, 'bg-amber-100/50 dark:bg-amber-950/30');
        })
        .always(function () {
            $btn.prop('disabled', false);
        });
    });

    // --- Удалить пользователя ---
    $(document).on('click', '[data-action="delete"]', function () {
        const $row = $(this).closest('tr');
        const id   = $row.data('user-id');
        const name = $row.find('td').eq(1).text().trim();

        Swal.fire(getSwalOpts({
            title: 'Вы уверены?',
            text: `Удалить пользователя ${name} (ID: ${id})? Это действие необратимо.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена'
        })).then((result) => {
            if (result.isConfirmed) {
                postJSON(`/admin/user/${id}/delete`, {}, function () {
                    $row.fadeOut(300, function () { $(this).remove(); });
                    showToast('success', 'Пользователь удален');
                });
            }
        });
    });

    // Вспышка цвета — визуальный фидбек
    function flashRow($row, colorClass) {
        $row.addClass(colorClass);
        setTimeout(function () {
            $row.removeClass(colorClass);
        }, 800);
    }
    
    // --- Сохранение цены AI ---
    $('#save-ai-price').on('click', function () {
        const price  = parseInt($('#ai-price-input').val(), 10);
        const $status = $('#ai-price-status');

        if (isNaN(price) || price < 0) {
            $status.removeClass('text-green-600').addClass('text-red-500').text('Ошибка ввода');
            return;
        }

        const originalText = $(this).text();
        $(this).text('...').prop('disabled', true);

        postJSON('/admin/settings/ai_price', { price: price }, (res) => {
            $('#ai-price-input').val(res.price);
            $status.removeClass('text-red-500').addClass('text-green-600 dark:text-green-400').text('✓ Сохранено');
            showToast('success', 'Цена обновлена');
            setTimeout(function () { $status.text(''); }, 2000);
        }, () => {
            $status.removeClass('text-green-600').addClass('text-red-500 dark:text-red-400').text('Ошибка');
        });

        setTimeout(() => {
            $(this).text(originalText).prop('disabled', false);
        }, 500);
    });
});