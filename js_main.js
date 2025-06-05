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

function handleTabChange(activeTabId) {
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
            if (window.userProfile) {
                displayProfileDetails(window.userProfile);
            } else {
                 document.getElementById('profile-details-view').innerHTML = '<p>Loading profile or profile not set up.</p>';
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
        navigateToPage('main-app-view', targetTabId); // Stays on main-app-view, changes tab
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

        // Try to load profile from local storage first
        const localProfile = localStorage.getItem('userProfile');
        if (localProfile) {
            window.userProfile = JSON.parse(localProfile);
            // Verify if this local profile belongs to the current user
            if (window.userProfile.id !== user.id) {
                console.warn("Local profile mismatch, fetching from server.");
                window.userProfile = await fetchProfile(user.id);
            }
        } else {
            window.userProfile = await fetchProfile(user.id);
        }


        if (window.userProfile) {
            console.log("Profile loaded:", window.userProfile.shop_name);
            navigateToPage('main-app-view', 'orders-page-content'); // Default to orders page
        } else {
            console.log("No profile found for user, navigating to profile setup.");
            navigateToPage('profile-setup-page');
        }
        // Request notification permission once user is logged in and likely to receive orders
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
        window.currentUser = session.user;
        // After sign-in, immediately fetch profile or guide to setup
        fetchProfile(session.user.id).then(profile => {
            if (profile) {
                window.userProfile = profile;
                navigateToPage('main-app-view', 'orders-page-content');
            } else {
                navigateToPage('profile-setup-page');
            }
        });
    } else if (event === 'SIGNED_OUT') {
        window.currentUser = null;
        window.userProfile = null;
        localStorage.removeItem('userProfile');
        localStorage.removeItem('autoConfirmOrders');
        navigateToPage('login-page');
    }
    // Other events: TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
});


// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState(); // Check auth state when DOM is ready
});
