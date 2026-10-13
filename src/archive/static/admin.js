$(document).ready(function () {

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
            Toast.fire({ icon: 'error', title: msg });
            onError && onError(xhr);
        });
    }

    // --- Сохранить баланс ---
    $(document).on('click', '[data-action="save-balance"]', function () {
        const $row  = $(this).closest('tr');
        const id    = $row.data('user-id');
        const value = parseInt($row.find('[data-balance-input]').val(), 10);

        if (isNaN(value) || value < 0) {
            Toast.fire({ icon: 'warning', title: 'Баланс должен быть целым неотрицательным числом' });
            return;
        }

        postJSON(`/admin/user/${id}/balance`, { balance: value }, function (res) {
            $row.find('[data-balance-input]').val(res.balance);
            Toast.fire({ icon: 'success', title: 'Баланс обновлен' });
            flashRow($row, 'bg-green-100');
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
                $badge.text('Администратор').removeClass('bg-gray-100 text-gray-700').addClass('bg-purple-100 text-purple-700');
                $btn.text('Разжаловать');
            } else {
                $badge.text('Пользователь').removeClass('bg-purple-100 text-purple-700').addClass('bg-gray-100 text-gray-700');
                $btn.text('В админы');
            }
            
            Toast.fire({ icon: 'success', title: 'Роль изменена' });
            flashRow($row, 'bg-amber-50');
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

        Swal.fire({
            title: 'Вы уверены?',
            text: `Удалить пользователя ${name} (ID: ${id})? Это действие необратимо.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена'
        }).then((result) => {
            if (result.isConfirmed) {
                postJSON(`/admin/user/${id}/delete`, {}, function () {
                    $row.fadeOut(300, function () { $(this).remove(); });
                    Toast.fire({ icon: 'success', title: 'Пользователь удален' });
                });
            }
        });
    });

    // Вспышка цвета — визуальный фидбек для Tailwind
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
            $status.removeClass('text-red-500').addClass('text-green-600').text('✓ Сохранено');
            Toast.fire({ icon: 'success', title: 'Цена обновлена' });
            setTimeout(function () { $status.text(''); }, 2000);
        }, () => {
            $status.removeClass('text-green-600').addClass('text-red-500').text('Ошибка');
        });

        setTimeout(() => {
            $(this).text(originalText).prop('disabled', false);
        }, 500);
    });
});