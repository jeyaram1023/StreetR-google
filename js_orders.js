// js/orders.js

const ordersListDiv = document.getElementById('orders-list');
const autoConfirmToggle = document.getElementById('auto-confirm-toggle');
let ordersSubscription = null;

// Ask for notification permission proactively
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            console.log(`Notification permission: ${permission}`);
        });
    }
}

// Run on script load
requestNotificationPermission();

autoConfirmToggle.addEventListener('change', (event) => {
    const isAutoConfirmOn = event.target.checked;
    localStorage.setItem('autoConfirmOrders', isAutoConfirmOn);
    console.log(`Auto-confirm orders: ${isAutoConfirmOn ? 'ON' : 'OFF'}`);
});

function loadAutoConfirmSetting() {
    const savedSetting = localStorage.getItem('autoConfirmOrders');
    if (savedSetting !== null) {
        autoConfirmToggle.checked = savedSetting === 'true';
    }
}

function renderOrder(order) {
    const orderItemDiv = document.createElement('div');
    orderItemDiv.className = 'order-item';
    orderItemDiv.dataset.orderId = order.id;

    let itemsHtml = '<ul>';
    if (order.order_details && Array.isArray(order.order_details.items)) {
        order.order_details.items.forEach(item => {
            itemsHtml += `<li>${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toFixed(2)}</li>`;
        });
    } else if (typeof order.order_details === 'string') {
        itemsHtml += `<li>${order.order_details}</li>`;
    } else {
        itemsHtml += `<li>Details not available in expected format.</li>`;
    }
    itemsHtml += '</ul>';

    orderItemDiv.innerHTML = `
        <p><strong>Order ID:</strong> ${order.id.substring(0, 8)}</p>
        <p><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
        <p><strong>Contact:</strong> ${order.customer_contact || 'N/A'}</p>
        <p><strong>Items:</strong></p>
        ${itemsHtml}
        <p><strong>Total:</strong> ₹${parseFloat(order.total_amount).toFixed(2)}</p>
        <p><strong>Status:</strong> <span class="order-status">${order.status}</span></p>
        <p><small>Received: ${new Date(order.created_at).toLocaleString()}</small></p>
        <div class="order-actions">
            ${order.status === 'Pending' ? `
                <button class="btn-not-available" data-id="${order.id}">❌ Not Available</button>
                <button class="btn-late-delivery" data-id="${order.id}">⏳ Late Delivery</button>
                <button class="btn-confirm-order" data-id="${order.id}">✅ Confirm Order</button>
            ` : `<p>Order actioned.</p>`}
        </div>
    `;
    ordersListDiv.prepend(orderItemDiv);

    if (order.status === 'Pending') {
        orderItemDiv.querySelector('.btn-not-available')?.addEventListener('click', () => updateOrderStatus(order.id, 'Not Available'));
        orderItemDiv.querySelector('.btn-late-delivery')?.addEventListener('click', () => updateOrderStatus(order.id, 'Late Delivery'));
        orderItemDiv.querySelector('.btn-confirm-order')?.addEventListener('click', () => updateOrderStatus(order.id, 'Confirmed'));
    }
}

async function updateOrderStatus(orderId, newStatus) {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) {
        alert('Profile not available. Cannot update order.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('seller_id', userProfile.id)
            .select()
            .single();

        if (error) throw error;

        console.log(`Order ${orderId} updated to ${newStatus}`);
        alert(`Order ${orderId} marked as "${newStatus}". Notice: Sala is Chauhan my streetr customer app.`);

        const orderCard = ordersListDiv.querySelector(`.order-item[data-order-id="${orderId}"]`);
        if (orderCard) {
            orderCard.querySelector('.order-status').textContent = newStatus;
            orderCard.querySelector('.order-actions').innerHTML = `<p>Order actioned.</p>`;
        }

    } catch (error) {
        console.error('Error updating order status:', error);
        alert(`Error: ${error.message}`);
    }
}

function subscribeToOrders() {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) {
        console.log("User profile not loaded. Cannot subscribe to orders yet.");
        ordersListDiv.innerHTML = "<p>Complete your profile to see orders.</p>";
        return;
    }

    if (ordersSubscription) {
        ordersSubscription.unsubscribe();
    }

    ordersListDiv.innerHTML = "<p>Listening for new orders...</p>";

    ordersSubscription = supabase
        .channel('public:orders')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `seller_id=eq.${userProfile.id}`
            },
            (payload) => {
                console.log('Change received!', payload);
                const changedOrder = payload.new || payload.old;

                if (payload.eventType === 'INSERT') {
                    if (autoConfirmToggle.checked && payload.new.status === 'Pending') {
                        console.log(`Auto-confirming order ${payload.new.id}`);
                        updateOrderStatus(payload.new.id, 'Confirmed');
                    } else {
                        renderOrder(payload.new);
                        showNotification(`New Order Received! ID: ${payload.new.id.substring(0,8)}`);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const orderCard = ordersListDiv.querySelector(`.order-item[data-order-id="${payload.new.id}"]`);
                    if (orderCard) {
                        orderCard.remove();
                        renderOrder(payload.new);
                    } else {
                        renderOrder(payload.new);
                    }
                } else if (payload.eventType === 'DELETE') {
                    const orderCard = ordersListDiv.querySelector(`.order-item[data-order-id="${payload.old.id}"]`);
                    if (orderCard) {
                        orderCard.remove();
                    }
                }
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to orders channel!');
                fetchInitialOrders();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.error('Order subscription error/closed:', status, err);
            }
        });
}

async function fetchInitialOrders() {
    const userProfile = window.userProfile;
    if (!userProfile || !userProfile.id) return;

    ordersListDiv.innerHTML = "<p>Loading existing orders...</p>";
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('seller_id', userProfile.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        ordersListDiv.innerHTML = '';
        if (data.length === 0) {
            ordersListDiv.innerHTML = "<p>No orders yet.</p>";
        } else {
            data.forEach(order => renderOrder(order));
        }
    } catch (error) {
        console.error('Error fetching initial orders:', error);
        ordersListDiv.innerHTML = "<p>Could not load orders.</p>";
    }
}

function unsubscribeFromOrders() {
    if (ordersSubscription) {
        ordersSubscription.unsubscribe();
        ordersSubscription = null;
        console.log('Unsubscribed from orders channel.');
    }
}

function showNotification(message) {
    if (Notification.permission === "granted") {
        new Notification("StreetR Seller", { body: message, icon: 'assets/app-icon.png' });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification("StreetR Seller", { body: message, icon: 'assets/app-icon.png' });
            }
        });
    }
    console.log("Notification:", message);
}

// Load setting on script start
loadAutoConfirmSetting();
