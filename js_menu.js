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
const itemImageInput = document.getElementById('item-image');

const menuItemsListDiv = document.getElementById('menu-items-list');

let currentEditingItemId = null;

// Open modal
fabAddMenu.addEventListener('click', () => {
    modalTitle.textContent = "Add New Menu Item";
    menuItemIdInput.value = '';
    itemNameInput.value = '';
    itemPriceInput.value = '';
    itemDescriptionInput.value = '';
    itemImageInput.value = '';
    currentEditingItemId = null;
    menuItemModal.style.display = 'block';
});

// Close modal
closeModalButton.addEventListener('click', () => {
    menuItemModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === menuItemModal) menuItemModal.style.display = 'none';
});

// Save menu item
saveMenuItemButton.addEventListener('click', async () => {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) {
        alert('Profile not loaded.');
        return;
    }

    const itemName = itemNameInput.value.trim();
    const itemPrice = parseFloat(itemPriceInput.value);
    const itemDescription = itemDescriptionInput.value.trim();
    const imageFile = itemImageInput.files[0];

    if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
        alert('Please enter a valid name and price.');
        return;
    }

    const menuItemData = {
        seller_id: userProfile.id,
        name: itemName,
        price: itemPrice,
        description: itemDescription,
        is_available: true,
    };

    try {
        let response;
        if (currentEditingItemId) {
            menuItemData.updated_at = new Date().toISOString();
            response = await supabase
                .from('menu_items')
                .update(menuItemData)
                .eq('id', currentEditingItemId)
                .eq('seller_id', userProfile.id)
                .select()
                .single();
        } else {
            response = await supabase
                .from('menu_items')
                .insert(menuItemData)
                .select()
                .single();
        }

        const { data, error } = response;
        if (error) throw error;

        // Upload image if selected
        if (imageFile && data) {
            await uploadItemImage(imageFile, data.id, userProfile.id);
        }

        alert(`Item ${currentEditingItemId ? 'updated' : 'added'} successfully!`);
        menuItemModal.style.display = 'none';
        fetchMenuItems();

    } catch (error) {
        console.error('Save error:', error);
        alert(`Error: ${error.message}`);
    }
});

async function uploadItemImage(file, itemId, sellerId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${itemId}-${Date.now()}.${fileExt}`;
    const filePath = `menu-item-images/${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('menu_item_images')
            .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('menu_item_images')
            .getPublicUrl(filePath);

        await supabase
            .from('menu_items')
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', itemId);

        console.log("Image uploaded:", publicUrl);
    } catch (error) {
        console.error("Image upload failed:", error.message);
        alert("Image upload error.");
    }
}

// Fetch all menu items
async function fetchMenuItems() {
    const userProfile = window.userProfile;
    if (!userProfile?.id) return;

    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('seller_id', userProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderMenuItems(data);
    } catch (error) {
        console.error("Fetch failed:", error);
        menuItemsListDiv.innerHTML = '<p>Error loading items.</p>';
    }
}

// Render menu items to page
function renderMenuItems(items) {
    menuItemsListDiv.innerHTML = '';
    if (!items.length) {
        menuItemsListDiv.innerHTML = '<p>No items yet.</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item-card';
        card.innerHTML = `
            <img src="${item.image_url || 'https://via.placeholder.com/80'}" class="item-image-preview" alt="${item.name}">
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>₹${item.price.toFixed(2)}</p>
                <p>${item.description || ''}</p>
            </div>
            <div class="item-controls">
                <button class="btn-edit-item" data-id="${item.id}">✏️</button>
                <button class="btn-delete-item" data-id="${item.id}">🗑️</button>
            </div>
        `;
        menuItemsListDiv.appendChild(card);
    });

    document.querySelectorAll('.btn-edit-item').forEach(btn =>
        btn.addEventListener('click', e =>
            handleEditItem(e.currentTarget.dataset.id, items)
        )
    );
    document.querySelectorAll('.btn-delete-item').forEach(btn =>
        btn.addEventListener('click', e =>
            handleDeleteItem(e.currentTarget.dataset.id)
        )
    );
}

function handleEditItem(id, items) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    modalTitle.textContent = "Edit Menu Item";
    currentEditingItemId = id;
    menuItemIdInput.value = id;
    itemNameInput.value = item.name;
    itemPriceInput.value = item.price;
    itemDescriptionInput.value = item.description || '';
    itemImageInput.value = ''; // Can't pre-fill file input
    menuItemModal.style.display = 'block';
}

async function handleDeleteItem(id) {
    if (!confirm("Delete this item?")) return;

    try {
        await supabase
            .from('menu_items')
            .delete()
            .eq('id', id);
        fetchMenuItems();
    } catch (error) {
        console.error("Delete failed:", error);
        alert("Could not delete item.");
    }
}

// Auto-load menu when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.userProfile?.id) fetchMenuItems();
});
