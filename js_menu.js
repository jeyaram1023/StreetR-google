// menu.js - Complete Solution with Image Uploads
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
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
  
  // Constants
  const BUCKET_NAME = 'menu-items'; // Valid bucket name
  let currentEditingItemId = null;

  // Image Preview Setup
  const imagePreview = document.createElement('img');
  imagePreview.id = 'item-image-preview';
  imagePreview.className = 'item-image-preview';
  imagePreview.style.maxWidth = '100px';
  imagePreview.style.display = 'none';
  imagePreview.alt = 'Preview';
  itemImageInput.parentNode.insertBefore(imagePreview, itemImageInput.nextSibling);

  // Event Listeners
  fabAddMenu.addEventListener('click', openModal);
  closeModalButton.addEventListener('click', closeModal);
  window.addEventListener('click', handleOutsideClick);
  itemImageInput.addEventListener('change', handleImagePreview);
  saveMenuItemButton.addEventListener('click', handleSaveMenuItem);

  // Initialize
  if (document.getElementById('add-menu-page-content').classList.contains('active')) {
    fetchMenuItems();
  }

  // ======================
  // CORE FUNCTIONALITY
  // ======================

  async function uploadItemImage(file, itemId, sellerId) {
    if (!file) return null;
    
    // Validate file size (5MB max for free tier)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be smaller than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${itemId}-${Date.now()}.${fileExt}`;

    try {
      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (error) {
      console.error('Upload failed:', error);
      throw error; // Re-throw for handling in calling function
    }
  }

  async function handleSaveMenuItem() {
    const user = window.currentUser;
    if (!user) {
      showAlert('Please login first', 'error');
      return;
    }

    // Disable button during processing
    saveMenuItemButton.disabled = true;
    saveMenuItemButton.textContent = 'Saving...';

    try {
      // Validate inputs
      const itemName = itemNameInput.value.trim();
      const itemPrice = parseFloat(itemPriceInput.value);
      const itemDescription = itemDescriptionInput.value.trim();
      const imageFile = itemImageInput.files[0];

      if (!itemName || isNaN(itemPrice) || itemPrice <= 0) {
        throw new Error('Item name and valid price are required');
      }

      // Prepare data
      const itemData = {
        seller_id: user.id,
        name: itemName,
        price: itemPrice,
        description: itemDescription,
        updated_at: new Date().toISOString()
      };

      // Save to database
      let savedItem;
      if (currentEditingItemId) {
        const { data, error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', currentEditingItemId)
          .eq('seller_id', user.id)
          .select()
          .single();
        if (error) throw error;
        savedItem = data;
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert(itemData)
          .select()
          .single();
        if (error) throw error;
        savedItem = data;
      }

      // Handle image upload if file exists
      if (imageFile) {
        try {
          const imageUrl = await uploadItemImage(imageFile, savedItem.id, user.id);
          if (imageUrl) {
            await supabase
              .from('menu_items')
              .update({ image_url: imageUrl })
              .eq('id', savedItem.id);
          }
        } catch (uploadError) {
          console.warn('Image upload failed, but item was saved', uploadError);
        }
      }

      showAlert('Item saved successfully!', 'success');
      closeModal();
      fetchMenuItems();

    } catch (error) {
      console.error('Save failed:', error);
      showAlert(`Error: ${error.message}`, 'error');
    } finally {
      saveMenuItemButton.disabled = false;
      saveMenuItemButton.textContent = 'Save Item';
    }
  }

  async function fetchMenuItems() {
    const user = window.currentUser;
    if (!user) return;

    try {
      menuItemsListDiv.innerHTML = '<div class="loading">Loading menu items...</div>';

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      renderMenuItems(data || []);

    } catch (error) {
      console.error('Fetch failed:', error);
      menuItemsListDiv.innerHTML = `
        <div class="error">
          Error loading menu items: ${error.message}
        </div>
      `;
    }
  }

  function renderMenuItems(items) {
    if (!items || items.length === 0) {
      menuItemsListDiv.innerHTML = `
        <div class="empty-state">
          No menu items yet. Click the "+" button to add one!
        </div>
      `;
      return;
    }

    menuItemsListDiv.innerHTML = '';
    items.forEach(item => {
      const itemCard = document.createElement('div');
      itemCard.className = 'menu-item-card';
      itemCard.dataset.id = item.id;

      itemCard.innerHTML = `
        <div class="item-image-container">
          <img src="${item.image_url || 'https://placehold.co/100x100?text=No+Image'}" 
               alt="${item.name}" 
               class="item-image">
          ${item.is_available ? '' : '<div class="unavailable-badge">SOLD OUT</div>'}
        </div>
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <p class="item-price">₹${item.price.toFixed(2)}</p>
          <p class="item-description">${item.description || 'No description'}</p>
        </div>
        <div class="item-actions">
          <button class="btn-edit" data-id="${item.id}">
            <i class="edit-icon"></i>
          </button>
          <button class="btn-delete" data-id="${item.id}">
            <i class="delete-icon"></i>
          </button>
        </div>
      `;

      menuItemsListDiv.appendChild(itemCard);
    });

    // Add event listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => handleEditItem(e.currentTarget.dataset.id, items));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => handleDeleteItem(e.currentTarget.dataset.id));
    });
  }

  // ======================
  // HELPER FUNCTIONS
  // ======================

  function openModal() {
    modalTitle.textContent = currentEditingItemId ? "Edit Menu Item" : "Add New Item";
    menuItemModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }

  function closeModal() {
    menuItemModal.style.display = 'none';
    document.body.style.overflow = '';
    resetForm();
  }

  function handleOutsideClick(e) {
    if (e.target === menuItemModal) closeModal();
  }

  function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.style.display = 'block';
    } else {
      imagePreview.style.display = 'none';
    }
  }

  function resetForm() {
    menuItemIdInput.value = '';
    itemNameInput.value = '';
    itemPriceInput.value = '';
    itemDescriptionInput.value = '';
    itemImageInput.value = '';
    imagePreview.style.display = 'none';
    currentEditingItemId = null;
  }

  function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }

  async function handleEditItem(itemId, items) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    currentEditingItemId = itemId;
    menuItemIdInput.value = itemId;
    itemNameInput.value = item.name;
    itemPriceInput.value = item.price;
    itemDescriptionInput.value = item.description || '';

    if (item.image_url) {
      imagePreview.src = item.image_url;
      imagePreview.style.display = 'block';
    }

    openModal();
  }

  async function handleDeleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    if (!window.currentUser) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)
        .eq('seller_id', window.currentUser.id);

      if (error) throw error;

      showAlert('Item deleted successfully', 'success');
      fetchMenuItems();

    } catch (error) {
      console.error('Delete failed:', error);
      showAlert(`Error: ${error.message}`, 'error');
    }
  }
});
