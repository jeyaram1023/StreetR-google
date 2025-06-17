// js/auth.js (seller app)

const loginEmailInput = document.getElementById('login-email');  
const loginButton = document.getElementById('login-button');  
const termsCheckbox = document.getElementById('terms-conditions');  
const loginMessage = document.getElementById('login-message');  
const logoutButton = document.getElementById('logout-button');  

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
        // Passwordless Magic Link Signup/Login
        const { data, error } = await supabase.auth.signInWithOtp({ 
            email: email,
            options: { 
                shouldCreateUser: true,
                emailRedirectTo: 'https://jeyaram1023.github.io/StreetR-seller-app/', // Change to your own
            },
        });

        if (error) {
            throw error;
        }

        loginMessage.textContent = 'Login link sent! Please check your email';
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

        localStorage.clear();
        window.currentUser = null;
        navigateToPage('login-page');  
        document.getElementById('app-header').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'none';
        logoutButton.style.display = 'none';
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

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
        console.log('User is authenticated!', session.user);

        // Check if profile exists
        let { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

        if (error && error.code === "PGRST404") {
            console.log("Profile not found, creating.");

            // Insert profile with user_type = Seller
            const { error: insertError } = await supabase.from("profiles").insert([{
                id: session.user.id,
                user_type: "Seller",
                // add additional fields if needed
            }]);

            if (insertError) {
                console.error("Error inserting profile.", insertError);
                alert("Error creating profile.");
            } else {
                console.log("Profile successfully created.");
            }
        } else if (error) {
            console.error("Error retrieving profile.", error);
        }

        // Store to localStorage for future use
        localStorage.setItem("currentUser", JSON.stringify(session.user));

        // Redirect to main application
        navigateToPage('profile-setup-page'); // or whatever you wish
        document.getElementById('app-header').style.display = '';
        document.getElementById('bottom-nav').style.display = '';
        logoutButton.style.display = '';
    } else {
        console.log("User is not authenticated.");
        localStorage.clear();
        navigateToPage('login-page'); 
        document.getElementById('app-header').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'none';
        logoutButton.style.display = 'none';
    }
});

// Event Listeners
if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
}

if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}
