// Automatically update current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Theme Toggle with Directional Diagonal Sliding Transition
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('.theme-icon');
const themeText = themeToggleBtn.querySelector('.theme-text');
const rootElement = document.documentElement;

// Load saved user preference or default to dark
const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
applyThemeUI(savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = rootElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  // Light to Dark -> Left to Right
  // Dark to Light -> Right to Left
  const direction = nextTheme === 'dark' ? 'left-to-right' : 'right-to-left';
  rootElement.setAttribute('data-transition-dir', direction);

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      applyThemeUI(nextTheme);
    });

    // Clean up transition direction attribute once animation completes
    transition.finished.finally(() => {
      rootElement.removeAttribute('data-transition-dir');
    });
  } else {
    // Fallback for older browsers
    applyThemeUI(nextTheme);
  }
});

function applyThemeUI(theme) {
  rootElement.setAttribute('data-theme', theme);
  localStorage.setItem('portfolio-theme', theme);

  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark';
  }
}

// Secure Contact Form Handler
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Update UI to show loading state
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formStatus.textContent = '';

  const formData = new FormData(contactForm);
  const object = Object.fromEntries(formData);
  const json = JSON.stringify(object);

  try {
    // 2. Post data to the secure endpoint
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: json
    });

    const result = await response.json();

    // 3. Handle success or error response
    if (response.status === 200 && result.success) {
      formStatus.textContent = '✓ Message sent successfully! I will get back to you soon.';
      formStatus.style.color = 'var(--text-main)';
      contactForm.reset();
    } else {
      formStatus.textContent = `✗ ${result.message || 'Something went wrong. Please try again.'}`;
      formStatus.style.color = '#ef4444'; // Red error text
    }
  } catch (error) {
    formStatus.textContent = '✗ Network error. Please check your connection and try again.';
    formStatus.style.color = '#ef4444';
  } finally {
    // 4. Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;

    // Dismiss message after 6 seconds
    setTimeout(() => {
      formStatus.textContent = '';
    }, 6000);
  }
});