// js/profile.js

const profileForm = document.getElementById('profile-form');
const profileMessage = document.getElementById('profile-message');
const letsGoButton = document.getElementById('lets-go-button');

// Profile Setup Page Elements
const shopNameInput = document.getElementById('shop-name');
const businessCategoryInput = document.getElementById('business-category');
const mobileNumberInput = document.getElementById('mobile-number');
const streetNameInput = document.getElementById('street-name');
const districtInput = document.getElementById('district');
const stateInput = document.getElementById('state');
const pincodeInput = document.getElementById('pincode');

// Profile Display Page Elements
const viewShopName = document.getElementById('view-shop-name');
const viewBusinessCategory = document.getElementById('view-business-category');
const viewMobileNumber = document.getElementById('view-mobile-number');
const viewStreetName = document.getElementById('view-street-name');
const viewDistrict = document.getElementById('view-district');
const viewState = document.getElementById('view-state');
const viewPincode = document.getElementById('view-pincode');
const editProfileButton = document.getElementById('edit-profile-button');
const sellerQRCodeDiv = document.getElementById('seller-qr-code');


async function saveProfile() {
    const user = window.currentUser;
    if (!user) {
        profileMessage.textContent = 'You must be logged in to save a profile.';
        return;
    }

    const profileData = {
        id: user.id, // Link to auth.uid()
        shop_name: shopNameInput.value,
        business_category: businessCategoryInput.value,
        mobile_number: mobileNumberInput.value,
        street_name: streetNameInput.value,
        district: districtInput.value,
        state: stateInput.value,
        pincode: pincodeInput.value,
        updated_at: new Date().toISOString()
    };

    // Validate form (basic)
    if (!profileData.shop_name || !profileData.business_category || !profileData.mobile_number ||
        !profileData.street_name || !profileData.district || !profileData.state || !profileData.pincode) {
        profileMessage.textContent = 'All fields are required.';
        profileMessage.style.color = 'red';
        return;
    }


    profileMessage.textContent = 'Saving...';
    profileMessage.style.color = 'inherit';

    try {
        // Upsert profile (insert if not exists, update if exists based on id)
        const { data, error } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single(); // .single() is important if you expect one row back

        if (error) throw error;

        // Save to local storage
        localStorage.setItem('userProfile', JSON.stringify(data));
        window.userProfile = data; // Update global profile

        profileMessage.textContent = 'Profile saved successfully!';
        profileMessage.style.color = 'green';
        setTimeout(() => {
            navigateToPage('lets-go-page');
        }, 1000);

    } catch (error) {
        console.error('Error saving profile:', error);
        profileMessage.textContent = `Error: ${error.message}`;
        profileMessage.style.color = 'red';
    }
}

async function fetchProfile(userId) {
    try {
        const { data, error, status } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && status !== 406) { // 406 means no rows found, which is fine for new users
            throw error;
        }

        if (data) {
            localStorage.setItem('userProfile', JSON.stringify(data));
            window.userProfile = data;
            return data;
        }
        return null; // No profile found
    } catch (error) {
        console.error('Error fetching profile:', error.message);
        return null;
    }
}

function populateProfileForm(profile) {
    if (profile) {
        shopNameInput.value = profile.shop_name || '';
        businessCategoryInput.value = profile.business_category || '';
        mobileNumberInput.value = profile.mobile_number || '';
        streetNameInput.value = profile.street_name || '';
        districtInput.value = profile.district || '';
        stateInput.value = profile.state || '';
        pincodeInput.value = profile.pincode || '';
    }
}

function displayProfileDetails(profile) {
    if (profile) {
        viewShopName.textContent = profile.shop_name || 'N/A';
        viewBusinessCategory.textContent = profile.business_category || 'N/A';
        viewMobileNumber.textContent = profile.mobile_number || 'N/A';
        viewStreetName.textContent = profile.street_name || 'N/A';
        viewDistrict.textContent = profile.district || 'N/A';
        viewState.textContent = profile.state || 'N/A';
        viewPincode.textContent = profile.pincode || 'N/A';

        // ✅ Working QR Code Logic
        const menuUrl = `${window.location.origin}/menu-viewer.html?sellerId=${profile.id}`;
        sellerQRCodeDiv.innerHTML = ""; // Clear previous QR if any

        if (typeof QRCode !== 'undefined') {
            new QRCode(sellerQRCodeDiv, {
                text: menuUrl,
                width: 128,
                height: 128
            });
        } else {
            sellerQRCodeDiv.innerHTML = `<p>QR Code library not loaded. URL: ${menuUrl}</p>`;
        }
    }
}

// Event Listeners
if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfile();
    });
}

if (letsGoButton) {
    letsGoButton.addEventListener('click', () => {
        navigateToPage('main-app-view', 'orders-page-content');
    });
}

if (editProfileButton) {
    editProfileButton.addEventListener('click', () => {
        populateProfileForm(window.userProfile);
        navigateToPage('profile-setup-page'); // Navigate to the setup page for editing
    });
}
