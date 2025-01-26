document.addEventListener('DOMContentLoaded', (event) => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Функция для установки темы
    function setTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙';
        }
    }

    // Проверяем сохраненную тему при загрузке страницы
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Обработчик клика по кнопке переключения темы
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Добавляем анимацию появления для контента
    const content = document.querySelector('main');
    content.classList.add('fade-in');
});

$(document).ready(function() {
    $('#feedback-form').on('submit', function(event) {
        event.preventDefault();

        var name = $('#name').val();
        var email = $('#email').val();
        var message = $('#message').val();

        var feedback = {
            name: name,
            email: email,
            message: message
        };

        $.ajax({
            type: 'POST',
            url: 'aaaak990RT', // Replace with your own email API endpoint
            data: JSON.stringify(feedback),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(response) {
                alert('Сообщение отправлено успешно!');
                $('#feedback-form')[0].reset();
            },
            error: function(xhr, status, error) {
                alert('Ошибка при отправке сообщения: ' + error);
            }
        });
    });
});