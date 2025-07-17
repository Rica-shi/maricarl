// Header management functions
function injectHeader() {
  // Don't inject header on login/signup pages
  const path = window.location.pathname;
  if (path.includes('login.html') || path.includes('signup.html')) return;

  // Don't inject header on index.html - it has its own header logic
  if (path.includes('index.html') || path.endsWith('/') || path === '') return;

  fetch('header.html')
    .then(res => res.text())
    .then(html => {
      const headerDiv = document.createElement('div');
      headerDiv.innerHTML = html;
      document.body.insertBefore(headerDiv, document.body.firstChild);
      // After header is injected, update login state
      updateHeaderLoginState();
    })
    .catch(error => {
      console.error('Failed to load header:', error);
    });
}

function updateHeaderLoginState() {
  const token = localStorage.getItem('jwt_token');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileIcon = document.getElementById('profileIcon');
  const jwtStatus = document.getElementById('jwtStatus');
  const userName = localStorage.getItem('user_name');
  const dropdownBtn = document.getElementById('dropdownBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');

  if (!logoutBtn || !profileIcon || !jwtStatus || !dropdownBtn || !dropdownMenu || !loginBtn || !signupBtn) {
    setTimeout(updateHeaderLoginState, 100);
    return;
  }

  if (token) {
    logoutBtn.style.display = '';
    profileIcon.style.display = '';
    dropdownBtn.style.display = '';
    jwtStatus.textContent = userName ? `Hello, ${userName}` : 'Hello!';
    jwtStatus.style.color = 'green';
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
  } else {
    logoutBtn.style.display = 'none';
    profileIcon.style.display = 'none';
    dropdownBtn.style.display = 'none';
    dropdownMenu.style.display = 'none';
    jwtStatus.textContent = '';
    loginBtn.style.display = '';
    signupBtn.style.display = '';
  }

  // Set up logout functionality
  logoutBtn.onclick = function() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    window.location.href = 'index.html';
  };
  // Set up login/signup button functionality
  loginBtn.onclick = function() {
    window.location.href = 'login.html';
  };
  signupBtn.onclick = function() {
    window.location.href = 'signup.html';
  };

  // Dropdown logic
  dropdownBtn.onclick = function(e) {
    e.stopPropagation();
    if (dropdownMenu.style.display === 'block') {
      dropdownMenu.style.display = 'none';
    } else {
      dropdownMenu.style.display = 'block';
    }
  };
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (dropdownMenu.style.display === 'block' && !dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
      dropdownMenu.style.display = 'none';
    }
  });
}

// Helper to set user name in localStorage after login/profile fetch
function setUserName(name) {
  if (name) {
    localStorage.setItem('user_name', name);
    updateHeaderLoginState();
  }
}

// Check login state and redirect if needed
function checkLoginState() {
  const token = localStorage.getItem('jwt_token');
  const path = window.location.pathname;

  // If on login/signup page and already logged in, redirect to home
  if ((path.includes('login.html') || path.includes('signup.html')) && token) {
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  // If on protected page (like profile) and not logged in, redirect to login
  if (path.includes('profile.html') && !token) {
    window.location.href = 'login.html?reason=notloggedin';
    return;
  }

  // If on admin page and not admin, redirect to login
  if (path.includes('admin.html') && (!token || localStorage.getItem('user_role') !== 'admin')) {
    window.location.href = 'login.html?reason=unauthorized';
    return;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  checkLoginState();
  injectHeader();
});