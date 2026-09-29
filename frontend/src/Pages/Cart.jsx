import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';

const API = 'http://127.0.0.1:8000/api/v1';
const headers = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], cart_total: 0 });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, { 
      ...options, 
      headers: { ...headers(), ...(options.headers || {}) } 
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed.');
    return data;
  };

  const loadCart = async () => {
    try {
      const currentCart = await request('/cart');
      setCart(currentCart);
    } catch (error) { 
      setMessage(error.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    const token = localStorage.getItem('token');
    if (token) {
      loadCart();
    }
  }, []);

  const refreshCart = async () => setCart(await request('/cart'));

  const updateCart = async (id, quantity) => {
    try { 
      if (quantity < 1) { 
        await removeFromCart(id); 
        return; 
      } 
      await request(`/cart/items/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ quantity }) 
      }); 
      await refreshCart(); 
    }
    catch (error) { 
      setMessage(error.message); 
    }
  };

  const removeFromCart = async (id) => { 
    try { 
      await request(`/cart/items/${id}`, { method: 'DELETE' }); 
      await refreshCart(); 
    } 
    catch (error) { 
      setMessage(error.message); 
    } 
  };

  const placeOrder = async () => {
    try { 
      await request('/orders', { method: 'POST' }); 
      setMessage('Order is placed and email is also sent successfully.'); 
      setTimeout(() => setMessage(''), 4000);
      await loadCart();
    }
    catch (error) { 
      setMessage(error.message || 'Stock availability changed. Please review your cart.'); 
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const cartItems = cart.items || [];

  return <main className="cart-page">
    <header className="cart-header">
      <div className="cart-header-left">
        <button className="back-button" onClick={() => navigate('/customer-dashboard')}>← Back to shopping</button>
      </div>
      <div className="cart-header-center">
        <h1>Your Cart</h1>
        <p>{cartItems.length} item(s)</p>
      </div>
      <button className="logout-btn" onClick={() => { localStorage.removeItem('token'); navigate('/login', { state: { toast: { type: 'error', message: 'Logout successfully' } } }); }}>Logout</button>
    </header>

    {message && <p className="cart-message" role="status">
      {message}
      <button onClick={() => setMessage('')} aria-label="Dismiss message">×</button>
    </p>}

    <div className="cart-container">
      {loading ? (
        <p>Loading cart…</p>
      ) : cartItems.length ? (
        <>
          <div className="cart-items-section">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div className="cart-item" key={item.inventory_id}>
                  <div className="item-details">
                    <strong>{item.name}</strong>
                    <span className="item-price">₹{Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="item-total">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </div>
                  <div className="cart-controls">
                    <button onClick={() => updateCart(item.inventory_id, item.quantity - 1)}>−</button>
                    <b>{item.quantity}</b>
                    <button onClick={() => updateCart(item.inventory_id, item.quantity + 1)}>+</button>
                    <button className="remove-cart" onClick={() => removeFromCart(item.inventory_id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="cart-summary">
            <div className="summary-section">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal ({cartItems.length} items)</span>
                <strong>₹{Number(cart.cart_total || 0).toFixed(2)}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>₹{Number(cart.cart_total || 0).toFixed(2)}</strong>
              </div>
              <button className="checkout" onClick={placeOrder}>Place order</button>
              <p className="checkout-note">Stock is checked again when you place the order.</p>
            </div>
          </aside>
        </>
      ) : (
        <div className="empty-cart-container">
          <p className="empty-cart">Your cart is empty.</p>
          <button className="continue-shopping" onClick={() => navigate('/customer-dashboard')}>Continue shopping</button>
        </div>
      )}
    </div>
  </main>;
}
