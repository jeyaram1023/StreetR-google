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

// Initialize image preview
const imagePreview = document.createElement('img');
imagePreview.id = 'item-image-preview';
imagePreview.className = 'item-image-preview';
imagePreview.style.maxWidth = '100px';
imagePreview.style.display = 'none';
itemImageInput.parentNode.insertBefore(imagePreview, itemImageInput.nextSibling);

// File input change handler
itemImageInput.addEventListener('change', function(e) {
  if (e.target.files[0]) {
    const url = URL.createObjectURL(e.target.files[0]);
    imagePreview.src = url;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.style.display = 'none';
  }
});

// Open Modal
fabAddMenu.addEventListener('click', () => {
  modalTitle.textContent = "Add New Menu Item";
  menuItemIdInput.value = '';
  itemNameInput.value = '';
  itemPriceInput.value = '';
  itemDescriptionInput.value = '';
  itemImageInput.value = '';
  imagePreview.style.display = 'none';
  currentEditingItemId = null;
  menuItemModal.style.display = 'block';
});

// Close Modal
closeModalButton.addEventListener('click', () => {
  menuItemModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === menuItemModal) {
    menuItemModal.style.display = 'none';
  }
});

// IMAGE UPLOAD FUNCTION (FIXED)
async function uploadItemImage(file, itemId, sellerId) {
  if (!file) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${sellerId}/${itemId}-${Date.now()}.${fileExt}`;
  const filePath = `menu-item-images/${fileName}`;

  try {
    // Upload image to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('menu_item_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('menu_item_images')
      .getPublicUrl(filePath);

    return publicUrl;
    
  } catch (error) {
    console.error('Image upload failed:', error);
    alert(`Upload error: ${error.message}`);
    return null;
  }
}

// Save Menu Item
saveMenuItemButton.addEventListener('click', async () => {
  const userProfile = window.userProfile;
  if (!userProfile?.id) {
    alert('Complete your profile to add menu items');
    return;
  }

  const itemName = itemNameInput.value.trim();
  const itemPrice = parseFloat(itemPriceInput.value);
  const itemDescription = itemDescriptionInput.value.trim();
  const imageFile = itemImageInput.files[0];

  if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
    alert('Item name and valid price are required');
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
    let newItemId;
    
    if (currentEditingItemId) {
      menuItemData.updated_at = new Date().toISOString();
      response = await supabase
        .from('menu_items')
        .update(menuItemData)
        .eq('id', currentEditingItemId)
        .eq('seller_id', userProfile.id)
        .select()
        .single();
      
      newItemId = currentEditingItemId;
    } else {
      response = await supabase
        .from('menu_items')
        .insert(menuItemData)
        .select()
        .single();
      
      newItemId = response.data.id;
    }

    const { data, error } = response;
    if (error) throw error;

    // Handle image upload if file exists
    if (imageFile && newItemId) {
      const imageUrl = await uploadItemImage(imageFile, newItemId, userProfile.id);
      
      if (imageUrl) {
        await supabase
          .from('menu_items')
          .update({ image_url: imageUrl })
          .eq('id', newItemId);
      }
    }

    menuItemModal.style.display = 'none';
    fetchMenuItems();

  } catch (error) {
    console.error('Error saving menu item:', error);
    alert(`Error: ${error.message}`);
  }
});

// Fetch and Display Menu Items
async function fetchMenuItems() {
  const userProfile = window.userProfile;
  if (!userProfile?.id) {
    menuItemsListDiv.innerHTML = '<p>Complete your profile to add menu items</p>';
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
    menuItemsListDiv.innerHTML = '<p>Error loading menu items</p>';
  }
}

function renderMenuItems(items) {
  menuItemsListDiv.innerHTML = '';
  if (!items || items.length === 0) {
    menuItemsListDiv.innerHTML = '<p>No menu items. Click "+" to add</p>';
    return;
  }

  items.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'menu-item-card';
    
    itemCard.innerHTML = `
      <img src="${item.image_url || 'https://via.placeholder.com/80x80.png?text=No+Image'}" 
           alt="${item.name}" 
           class="item-image-preview">
      <div class="item-details">
        <h4>${item.name}</h4>
        <p>Price: ₹${parseFloat(item.price).toFixed(2)}</p>
        <p>${item.description || 'No description'}</p>
      </div>
      <div class="item-controls">
        <label class="switch small-switch" title="Availability">
          <input type="checkbox" data-id="${item.id}" 
                 class="availability-toggle" ${item.is_available ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
        <button class="btn-edit-item" data-id="${item.id}" title="Edit">✏️</button>
        <button class="btn-delete-item" data-id="${item.id}" title="Delete">🗑️</button>
      </div>
      <div class="auto-off-scheduler">
        <label for="auto-off-${item.id}">Auto OFF at:</label>
        <input type="time" id="auto-off-${item.id}" 
               data-id="${item.id}" 
               class="auto-off-time" 
               value="${item.auto_off_time ? formatTimeForInput(item.auto_off_time) : ''}">
      </div>
    `;
    
    menuItemsListDiv.appendChild(itemCard);
  });

  // Add event listeners
  document.querySelectorAll('.btn-edit-item').forEach(button => {
    button.addEventListener('click', (e) => 
      handleEditItem(e.currentTarget.dataset.id, items));
  });
  
  document.querySelectorAll('.btn-delete-item').forEach(button => {
    button.addEventListener('click', (e) => 
      handleDeleteItem(e.currentTarget.dataset.id));
  });
  
  document.querySelectorAll('.availability-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => 
      handleAvailabilityToggle(e.currentTarget.dataset.id, e.currentTarget.checked));
  });
  
  document.querySelectorAll('.auto-off-time').forEach(input => {
    input.addEventListener('change', (e) => 
      handleAutoOffSet(e.currentTarget.dataset.id, e.currentTarget.value));
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
  const item = items.find(i => i.id === itemId);
  if (!item) return;

  modalTitle.textContent = "Edit Menu Item";
  currentEditingItemId = itemId;
  menuItemIdInput.value = itemId;
  itemNameInput.value = item.name;
  itemPriceInput.value = parseFloat(item.price).toFixed(2);
  itemDescriptionInput.value = item.description || '';
  
  if (item.image_url) {
    imagePreview.src = item.image_url;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.style.display = 'none';
  }
  
  menuItemModal.style.display = 'block';
}

async function handleDeleteItem(itemId) {
  if (!confirm('Delete this menu item?')) return;
  if (!window.userProfile?.id) return;

  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('seller_id', window.userProfile.id);

    if (error) throw error;
    fetchMenuItems();
    
  } catch (error) {
    console.error('Delete error:', error);
    alert(`Error: ${error.message}`);
  }
}

async function handleAvailabilityToggle(itemId, isAvailable) {
  if (!window.userProfile?.id) return;

  try {
    const { error } = await supabase
      .from('menu_items')
      .update({ 
        is_available: isAvailable,
        updated_at: new Date().toISOString() 
      })
      .eq('id', itemId)
      .eq('seller_id', window.userProfile.id);

    if (error) throw error;
    
  } catch (error) {
    console.error('Availability error:', error);
    alert(`Error: ${error.message}`);
    fetchMenuItems(); // Reset UI on error
  }
}

async function handleAutoOffSet(itemId, timeValue) {
  if (!window.userProfile?.id) return;

  let autoOffDateTime = null;
  
  if (timeValue) {
    const [hours, minutes] = timeValue.split(':');
    const today = new Date();
    autoOffDateTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      parseInt(hours),
      parseInt(minutes)
    ).toISOString();
  }

  try {
    const { error } = await supabase
      .from('menu_items')
      .update({ 
        auto_off_time: autoOffDateTime,
        updated_at: new Date().toISOString() 
      })
      .eq('id', itemId)
      .eq('seller_id', window.userProfile.id);

    if (error) throw error;
    
  } catch (error) {
    console.error('Auto-off error:', error);
    alert(`Error: ${error.message}`);
    fetchMenuItems(); // Reset UI on error
  }
}

// Initialize when menu tab is shown
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('add-menu-page-content').classList.contains('active')) {
    fetchMenuItems();
  }
});
