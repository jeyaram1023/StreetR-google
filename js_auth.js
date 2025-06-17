// js/auth.js

// Get elements from the HTML
const loginEmailInput = document.getElementById('login-email');
const loginButton = document.getElementById('login-button');
const termsCheckbox = document.getElementById('terms-conditions');
const loginMessage = document.getElementById('login-message');
const logoutButton = document.getElementById('logout-button');

// Handle passwordless (magic link) login
async function handleLogin() {
    const email = loginEmailInput.value.trim();

    if (!email) {
        loginMessage.textContent = 'Please enter your email';
        return;
    }

    if (!termsCheckbox.checked) {
        loginMessage.textContent = 'You must accept the Terms & Conditions';
        return;
    }

    loginMessage.textContent = 'Logging in…';
    loginButton.disabled = true;

    try {
        // This lets new users be created if they do not exist
        const { data, error } = await supabase.auth.signInWithOtp({ 
            email: email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            throw error;
        }

        loginMessage.textContent = 'Login link sent! Please check your email to complete signing in';
    } catch (error) {
        console.error('Login error!', error);
        loginMessage.textContent = `Error: ${error.message}`;
    } finally {
        loginButton.disabled = false;
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Logout error!', error);
            alert('Error logging out: ' + error.message);
            return;
        }

        // Clear local storage
        localStorage.clear();

        // Redirect back to login page
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error logging out!', error);
    }
}

async function getCurrentUser() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Error retrieving current user.", error);
            return null;
        }

        return session?.user ?? null;

    } catch (error) {
        console.error("Error retrieving current user.", error);
        return null;
    }
}

// Attach event handlers
if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
}

if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}

// Optional: Handle authentication state
supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        console.log('User is authenticated!', session.user);
        // Redirect or show profile
        // window.location.href = '/profile.html';
    } else {
        console.log('User is not authenticated');
        // Redirect to login
        // window.location.href = '/login.html';
    }
});
