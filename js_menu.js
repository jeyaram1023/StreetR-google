// js/menu.js
const fabAddMenu = document.getElementById('fab-add-menu');
const menuItemModal = document.getElementById('menu-item-modal');
const closeModalButton = menuItemModal.querySelector('.close-button');
const saveMenuItemButton = document.getElementById('save-menu-item-button');
const modalTitle = document.getElementById('modal-title');
const menuItemIdInput = document.getElementById('menu-item-id');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemDescriptionInput = document.getElementById('item-description');
const itemImageInput = document.getElementById('item-image'); // Basic file input
const menuItemsListDiv = document.getElementById('menu-items-list');
let currentEditingItemId = null;

// Open Modal
fabAddMenu.addEventListener('click', () => {
    modalTitle.textContent = "Add New Menu Item";
    menuItemIdInput.value = ''; // Clear ID for new item
    itemNameInput.value = '';
    itemPriceInput.value = '';
    itemDescriptionInput.value = '';
    itemImageInput.value = ''; // Clear file input
    currentEditingItemId = null;
    menuItemModal.style.display = 'block';
});

// Close Modal
closeModalButton.addEventListener('click', () => {
    menuItemModal.style.display = 'none';
});
window.addEventListener('click', (event) => { // Close if clicked outside
    if (event.target == menuItemModal) {
        menuItemModal.style.display = 'none';
    }
});

// Save Menu Item
saveMenuItemButton.addEventListener('click', async () => {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) {
        alert('Profile not loaded. Cannot save item.');
        return;
    }
    const itemName = itemNameInput.value.trim();
    const itemPrice = parseFloat(itemPriceInput.value);
    const itemDescription = itemDescriptionInput.value.trim();
    [span_0](start_span)const imageFile = itemImageInput.files[0]; // For actual image upload[span_0](end_span)
    if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
        alert('Item name and a valid price are required.');
        return;
    }
    const menuItemData = {
        seller_id: userProfile.id,
        name: itemName,
        price: itemPrice,
        description: itemDescription,
        is_available: true, // Default
    };
    try {
        let response;
        if (currentEditingItemId) { // Editing existing item
            menuItemData.updated_at = new Date().toISOString();
            response = await supabase
                .from('menu_items')
                .update(menuItemData)
                .eq('id', currentEditingItemId)
                .eq('seller_id', userProfile.id) // Ensure seller owns this item
                .select()
                .single();
        } else { // Adding new item
            response = await supabase
                .from('menu_items')
                .insert(menuItemData)
                .select()
                .single();
        }
        const { data, error } = response;
        if (error) throw error;
        
        // Handle image upload to Supabase Storage here
        if (imageFile && data) {
           await uploadItemImage(imageFile, data.id, userProfile.id);
        }

        alert(`Menu item ${currentEditingItemId ? 'updated' : 'saved'} successfully!`);
        menuItemModal.style.display = 'none';
        fetchMenuItems(); // Refresh the list
        
    } catch (error) {
        console.error('Error saving menu item:', error);
        alert(`Error: ${error.message}`);
    }
});

// Fetch and Display Menu Items
async function fetchMenuItems() {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) {
        menuItemsListDiv.innerHTML = '<p>Please complete your profile to add menu items.</p>';
        return;
    }
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('seller_id', userProfile.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        renderMenuItems(data);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        menuItemsListDiv.innerHTML = '<p>Could not load menu items.</p>';
    }
}

function renderMenuItems(items) {
    menuItemsListDiv.innerHTML = ''; // Clear existing
    if (!items || items.length === 0) {
        menuItemsListDiv.innerHTML = '<p>No menu items yet. Click the "+" button to add one!</p>';
        return;
    }
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'menu-item-card';
        // Add a timestamp to the image URL to bypass browser cache
        const imageUrl = item.image_url ? `${item.image_url}?t=${new Date().getTime()}` : 'https://via.placeholder.com/80x80.png?text=No+Image';
        itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="item-image-preview">
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>Price: ₹${parseFloat(item.price).toFixed(2)}</p>
                <p>${item.description || 'No description'}</p>
            </div>
            <div class="item-controls">
                <label class="switch small-switch" title="Availability">
                    <input type="checkbox" data-id="${item.id}" class="availability-toggle" ${item.is_available ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="btn-edit-item" data-id="${item.id}" title="Edit">✏️</button>
                <button class="btn-delete-item" data-id="${item.id}" title="Delete">🗑️</button>
            </div>
            <div class="auto-off-scheduler">
                <label for="auto-off-${item.id}">Auto OFF at:</label>
                <input type="time" id="auto-off-${item.id}" data-id="${item.id}" class="auto-off-time" value="${item.auto_off_time ? formatTimeForInput(item.auto_off_time) : ''}">
            </div>
        `;
        menuItemsListDiv.appendChild(itemCard);
    });
    // Add event listeners for new elements
    document.querySelectorAll('.btn-edit-item').forEach(button => {
        button.addEventListener('click', (e) => handleEditItem(e.currentTarget.dataset.id, items));
    });
    document.querySelectorAll('.btn-delete-item').forEach(button => {
        button.addEventListener('click', (e) => handleDeleteItem(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('.availability-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => handleAvailabilityToggle(e.currentTarget.dataset.id, e.currentTarget.checked));
    });
    document.querySelectorAll('.auto-off-time').forEach(input => {
        input.addEventListener('change', (e) => handleAutoOffSet(e.currentTarget.dataset.id, e.currentTarget.value));
    });
}

function formatTimeForInput(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function handleEditItem(itemId, items) {
    const itemToEdit = items.find(item => item.id === itemId);
    if (itemToEdit) {
        modalTitle.textContent = "Edit Menu Item";
        currentEditingItemId = itemId;
        menuItemIdInput.value = itemId;
        itemNameInput.value = itemToEdit.name;
        itemPriceInput.value = parseFloat(itemToEdit.price).toFixed(2);
        itemDescriptionInput.value = itemToEdit.description || '';
        itemImageInput.value = '';
        menuItemModal.style.display = 'block';
    }
}

async function handleDeleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const userProfile = window.userProfile;
    try {
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', itemId)
            .eq('seller_id', userProfile.id);
        if (error) throw error;
        alert('Item deleted successfully.');
        fetchMenuItems(); // Refresh list
    } catch (error) {
        console.error('Error deleting item:', error);
        alert(`Error: ${error.message}`);
    }
}

async function handleAvailabilityToggle(itemId, isAvailable) {
    const userProfile = window.userProfile;
    try {
        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .eq('seller_id', userProfile.id);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating availability:', error);
        alert(`Error: ${error.message}`);
        fetchMenuItems();
    }
}

async function handleAutoOffSet(itemId, timeValue) {
    const userProfile = window.userProfile;
    let autoOffDateTime = null;
    if (timeValue) {
        const [hours, minutes] = timeValue.split(':');
        const today = new Date();
        autoOffDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes).toISOString();
    }
    try {
        const { error } = await supabase
            .from('menu_items')
            .update({ auto_off_time: autoOffDateTime, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .eq('seller_id', userProfile.id);
        if (error) throw error;
    } catch (error) {
        console.error('Error setting auto-off time:', error);
        alert(`Error: ${error.message}`);
        fetchMenuItems();
    }
}

// This function is now active
async function uploadItemImage(file, itemId, sellerId) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${itemId}-${Date.now()}.${fileExt}`;
    const filePath = `menu-item-images/${fileName}`;
    try {
        const { data, error } = await supabase.storage
            [span_1](start_span).from('menu-item-images') // Ensure this bucket exists and has correct policies[span_1](end_span)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true // Overwrites file if it already exists, useful for editing
            });
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('menu-item-images').getPublicUrl(filePath);
        
        // Update the menu_items table with this URL
        await supabase
            .from('menu_items')
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', itemId);
            
        console.log('Image uploaded and URL saved:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Image upload failed: ' + error.message);
        return null;
    }
}
