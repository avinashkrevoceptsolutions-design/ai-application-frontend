import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import groceryImage from '../assets/grocery.jpg';
import './CustomerDashboard.css';

const API = 'http://127.0.0.1:8000/api/v1';
const headers = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], cart_total: 0 });
  const [orders, setOrders] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
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
    const response = await fetch(`${API}${url}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed.');
    return data;
  };
  const loadData = async () => {
    try {
      const [inventory, currentCart, previousOrders] = await Promise.all([request('/inventory'), request('/cart'), request('/orders')]);
      setProducts(inventory);
      setCart(currentCart);
      setOrders(previousOrders);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { 
    const token = localStorage.getItem('token');
    if (token) {
      loadData();
    }
  }, []);
  const refreshCart = async () => setCart(await request('/cart'));
  const addToCart = async (product) => {
    try { 
      await request('/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventory_id: product.id, quantity: 1 }) }); 
      await refreshCart(); 
      setMessage(`${product.name} is added to cart successfully.`); 
      setTimeout(() => setMessage(''), 3000);
    }
    catch (error) { 
      setMessage(error.message); 
      setTimeout(() => setMessage(''), 3000);
    }
  };
  const updateCart = async (id, quantity) => {
    try { if (quantity < 1) { await removeFromCart(id); return; } await request(`/cart/items/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity }) }); await refreshCart(); }
    catch (error) { setMessage(error.message); }
  };
  const removeFromCart = async (id) => { try { await request(`/cart/items/${id}`, { method: 'DELETE' }); await refreshCart(); } catch (error) { setMessage(error.message); } };
  const placeOrder = async () => {
    try { 
      await request('/orders', { method: 'POST' }); 
      setMessage('Order is placed and email is also sent successfully.'); 
      setTimeout(() => setMessage(''), 4000);
      await loadData(); 
    }
    catch (error) { 
      setMessage(error.message || 'Stock availability changed. Please review your cart.'); 
      setTimeout(() => setMessage(''), 4000);
    }
  };
  const cartItems = cart.items || [];

  return <main className="customer-dashboard">
    <header className="customer-header"><div><p className="customer-eyebrow">Fresh market</p><h1>Shop groceries</h1><p>Choose fresh essentials and we'll keep your cart ready.</p></div><div className="customer-header-actions"><button className="show-cart" onClick={() => navigate('/cart')}>Your cart <span>{cartItems.length}</span></button><button className="customer-logout" onClick={() => { localStorage.removeItem('token'); navigate('/login', { state: { toast: { type: 'error', message: 'Logout successfully' } } }); }}>Logout</button></div></header>
    {message && <p className="customer-message" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></p>}
    <div className="customer-layout"><section><div className="customer-section-heading"><h2>Available products</h2><span>{products.length} items</span></div>{loading ? <p>Loading products…</p> : <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><img src={product.image || groceryImage} alt={product.name} onError={(event) => { event.currentTarget.src = groceryImage; }} /><div><span className={product.status === 'OUT_OF_STOCK' || product.quantity_available === 0 ? 'availability unavailable' : 'availability'}>{product.status === 'OUT_OF_STOCK' || product.quantity_available === 0 ? 'Out of stock' : `${product.quantity_available} available`}</span><h3>{product.name}</h3><p className="product-price">₹{Number(product.price).toFixed(2)}</p><div className="product-actions"><button onClick={() => setSelectedProduct(product)}>Details</button><button className="add-cart" disabled={product.status === 'OUT_OF_STOCK' || product.quantity_available === 0} onClick={() => addToCart(product)}>Add to cart</button></div></div></article>)}</div>}</section>
      <aside className="cart-panel" id="your-cart"><div className="customer-section-heading"><h2>Your cart</h2><span>{cartItems.length} items</span></div>{cartItems.length ? <><div className="cart-items">{cartItems.map((item) => <div className="cart-item" key={item.inventory_id}><div><strong>{item.name}</strong><span>₹{Number(item.price).toFixed(2)}</span></div><div className="cart-controls"><button onClick={() => updateCart(item.inventory_id, item.quantity - 1)}>−</button><b>{item.quantity}</b><button onClick={() => updateCart(item.inventory_id, item.quantity + 1)}>+</button><button className="remove-cart" onClick={() => removeFromCart(item.inventory_id)}>Remove</button></div></div>)}</div><div className="cart-total"><span>Total</span><strong>₹{Number(cart.cart_total || 0).toFixed(2)}</strong></div><button className="checkout" onClick={placeOrder}>Place order</button><p className="checkout-note">Stock is checked again when you place the order.</p></> : <p className="empty-cart">Your cart is empty.</p>}</aside></div>
    <section className="orders-section"><div className="customer-section-heading"><h2>Previous orders</h2><span>{orders.length} orders</span></div>{orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id}><div><strong>Order #{order.id.slice(-6)}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div><span>{order.items.length} item(s)</span><b>₹{Number(order.total_amount).toFixed(2)}</b></article>)}</div> : <p>No previous orders yet.</p>}</section>
    {selectedProduct && <div className="product-modal-backdrop" onMouseDown={() => setSelectedProduct(null)}><section className="product-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button><img src={selectedProduct.image || groceryImage} alt={selectedProduct.name} /><h2>{selectedProduct.name}</h2><p className="product-price">₹{Number(selectedProduct.price).toFixed(2)}</p><p>{selectedProduct.quantity_available} currently available.</p><button className="add-cart" disabled={selectedProduct.status === 'OUT_OF_STOCK' || selectedProduct.quantity_available === 0} onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>Add to cart</button></section></div>}
  </main>;
}
