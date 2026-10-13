// Theme switcher supporting 'dark', 'light', or system preference
(function() {
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    initTheme();

    // Listen for system theme changes if user hasn't explicitly set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    });

    // Global toggle function
    window.toggleTheme = function() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    // Helper for SweetAlert2 dark theme configuration
    window.getSwalThemeConfig = function() {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            return {
                background: '#1e293b',
                color: '#f8fafc',
                customClass: {
                    popup: 'border border-slate-700 shadow-2xl rounded-2xl'
                }
            };
        }
        return {
            background: '#ffffff',
            color: '#1e293b',
            customClass: {
                popup: 'rounded-2xl'
            }
        };
    };
})();
