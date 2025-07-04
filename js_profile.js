// js/main.js

const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('#main-app-view .tab-content');
const appHeader = document.getElementById('app-header');
const bottomNav = document.getElementById('bottom-nav');
const historyIcon = document.getElementById('history-icon');
const logoutBtn = document.getElementById('logout-button');


window.currentUser = null;
window.userProfile = null;

function navigateToPage(pageId, tabContentId = null) {
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });

    // Handle main app view tabs
    if (pageId === 'main-app-view') {
        appHeader.style.display = 'flex';
        bottomNav.style.display = 'flex';
        logoutBtn.style.display = 'block';

        tabContents.forEach(tab => tab.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        let activeTabFound = false;
        if (tabContentId) {
            const targetTab = document.getElementById(tabContentId);
            const targetNavItem = bottomNav.querySelector(`[data-page="${tabContentId}"]`);
            if (targetTab) {
                targetTab.classList.add('active');
                activeTabFound = true;
            }
            if (targetNavItem) {
                targetNavItem.classList.add('active');
            }
        }

        // Default to orders tab if no specific tab or if target not found
        if (!activeTabFound) {
            document.getElementById('orders-page-content').classList.add('active');
            bottomNav.querySelector('[data-page="orders-page-content"]').classList.add('active');
        }

        // Trigger actions for the active tab
        const currentActiveTabId = document.querySelector('#main-app-view .tab-content.active').id;
        handleTabChange(currentActiveTabId);

    } else { // Not in main app view (e.g. login, profile setup)
        appHeader.style.display = 'none';
        bottomNav.style.display = 'none';
        logoutBtn.style.display = 'none';
        unsubscribeFromOrders(); // Unsubscribe when leaving main app view
    }
}

// **MODIFIED**: Made function async and added robust profile fetching
async function handleTabChange(activeTabId) {
    // Unsubscribe from orders if not on orders page and subscription exists
    if (activeTabId !== 'orders-page-content' && window.ordersSubscription) {
        unsubscribeFromOrders();
    }

    switch (activeTabId) {
        case 'orders-page-content':
            if (window.userProfile) { // Ensure profile is loaded
                subscribeToOrders(); // Subscribe or re-subscribe
                loadAutoConfirmSetting();
            } else {
                 document.getElementById('orders-list').innerHTML = '<p>Please complete your profile to view orders.</p>';
            }
            break;
        case 'add-menu-page-content':
            if (window.userProfile) {
                fetchMenuItems(); // Load menu items
            } else {
                document.getElementById('menu-items-list').innerHTML = '<p>Please complete your profile to manage your menu.</p>';
            }
            break;
        case 'profile-display-page-content':
            // **NEW**: Robust logic to fetch profile if not already loaded
            const profileDetailsView = document.getElementById('profile-details-view');

            if (window.userProfile) {
                // If profile is already loaded, display it instantly.
                displayProfileDetails(window.userProfile);
            } else if (window.currentUser) {
                // If not loaded, but we have a logged-in user, fetch it.
                profileDetailsView.innerHTML = '<p>Loading profile...</p>';
                try {
                    const profile = await fetchProfile(window.currentUser.id);
                    if (profile) {
                        // fetchProfile already sets window.userProfile
                        displayProfileDetails(profile);
                    } else {
                        // This means fetch completed but found no profile
                        profileDetailsView.innerHTML = '<p>No profile found. Please complete your profile setup.</p>';
                        document.getElementById('seller-qr-code').innerHTML = '';
                    }
                } catch (error) {
                    console.error("Failed to fetch profile on tab change:", error);
                    profileDetailsView.innerHTML = '<p>Error loading profile. Please try refreshing the page.</p>';
                }
            } else {
                // If there's no user logged in (edge case)
                profileDetailsView.innerHTML = '<p>You are not logged in.</p>';
            }
            break;
        case 'history-page-content':
            // Load history data if implementing this page
            document.getElementById('order-history-list').innerHTML = "<p>Order history would be shown here.</p>";
            break;
    }
}


// Bottom Navigation Click Handler
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTabId = item.getAttribute('data-page');
        navigateToPage('main-app-view', targetTabId);
    });
});

// History Icon Click Handler
historyIcon.addEventListener('click', () => {
    navigateToPage('main-app-view', 'history-page-content');
});

// Check auth state on initial load
async function checkAuthState() {
    const user = await getCurrentUser();
    if (user) {
        window.currentUser = user;
        console.log("User is logged in:", user.email);
        
        // Fetch profile from server to ensure it's up-to-date
        window.userProfile = await fetchProfile(user.id);

        // Check not only if a profile exists, but if it's a COMPLETE seller profile.
        if (window.userProfile && window.userProfile.shop_name) {
            // If shop_name exists, the profile is complete. Go to the main app.
            console.log("Complete profile loaded for:", window.userProfile.shop_name);
            navigateToPage('main-app-view', 'orders-page-content');
        } else {
            // If profile has no shop_name, or if profile is null, go to setup.
            console.log("Incomplete profile found, navigating to profile setup.");
            navigateToPage('profile-setup-page');
        }

        // Request notification permission
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

    } else {
        console.log("User is not logged in.");
        navigateToPage('login-page');
    }
}

// Handle session refresh (e.g., after magic link login)
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session);
    if (event === 'SIGNED_IN' && session) {
        // When user signs in, trigger the main auth check to fetch profile and navigate
        checkAuthState();
    } else if (event === 'SIGNED_OUT') {
        window.currentUser = null;
        window.userProfile = null;
        localStorage.removeItem('userProfile');
        localStorage.removeItem('autoConfirmOrders');
        navigateToPage('login-page');
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState(); // Check auth state when DOM is ready

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/StreetR-seller-app/service-worker.js')
          .then(reg => console.log('✅ Service Worker registered', reg))
          .catch(err => console.error('❌ Service Worker failed:', err));
    }
});
