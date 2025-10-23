document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.querySelector('[data-logout]');

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha ao encerrar a sessão (${response.status})`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = '/';
    }
  });
});
