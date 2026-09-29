import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import groceryImage from '../assets/grocery.jpg';
import './AdminDashboard.css';
import './AdminDashboardTheme.css';
import './AdminChat.css';

const ADJUSTMENT_HISTORY_KEY = 'admin-inventory-adjustments';
const INVENTORY_API_URL = 'http://127.0.0.1:8000/api/v1/admin/inventory';
const ADMIN_CHAT_API_URL = 'http://127.0.0.1:8000/api/v1/admin/chat';
const emptyItem = { name: '', price: '', quantity: '', image: '' };
const emptyAdjustment = { inventoryId: '', adjustmentType: 'ADD', quantity: '', reason: '' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemFormError, setItemFormError] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [adjustment, setAdjustment] = useState(emptyAdjustment);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Ask me about stock levels, products, or inventory trends.' }]);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadInventory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(INVENTORY_API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Unable to load inventory.');
        setInventory(data.map((item) => ({
          ...item,
          quantity: item.quantity_available,
          image: item.image || groceryImage,
        })));
      } catch (error) {
        if (error.name !== 'AbortError') setInventoryError(error.message || 'Unable to load inventory.');
      } finally {
        if (!controller.signal.aborted) setIsInventoryLoading(false);
      }
    };
    loadInventory();
    return () => controller.abort();
  }, []);
  const [adjustmentHistory, setAdjustmentHistory] = useState(() => {
    const savedHistory = localStorage.getItem(ADJUSTMENT_HISTORY_KEY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  useEffect(() => { localStorage.setItem(ADJUSTMENT_HISTORY_KEY, JSON.stringify(adjustmentHistory)); }, [adjustmentHistory]);
  const closeForm = () => { setForm(emptyItem); setEditingId(null); setItemFormError(''); setIsFormOpen(false); };
  const closeAdjustmentForm = () => { setAdjustment(emptyAdjustment); setAdjustmentError(''); setIsAdjustmentOpen(false); };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSavingItem) return;
    setItemFormError('');
    const item = { name: form.name.trim(), price: Number(form.price), quantity: Number(form.quantity), image: form.image.trim() || groceryImage };
    if (editingId) {
      setInventory((items) => items.map((current) => current.id === editingId ? { ...current, ...item } : current));
      closeForm();
      return;
    }
    setIsSavingItem(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(INVENTORY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: item.name, price: item.price, quantity_available: item.quantity, image: item.image }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail?.[0]?.msg || data.detail || 'Unable to add this item.');
      const savedItem = data.data || data;
      setInventory((items) => [{ ...savedItem, quantity: savedItem.quantity_available, image: savedItem.image || groceryImage }, ...items]);
      closeForm();
    } catch (error) {
      setItemFormError(error.message || 'Unable to add this item.');
    } finally {
      setIsSavingItem(false);
    }
  };
  const handleEdit = (item) => { setForm({ name: item.name, price: item.price, quantity: item.quantity, image: item.image === groceryImage ? '' : item.image }); setEditingId(item.id); setIsFormOpen(true); };
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item from inventory?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${INVENTORY_API_URL}/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to delete this item.');
      setInventory((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      window.alert(error.message || 'Unable to delete this item.');
    }
  };
  const handleAdjustment = async (event) => {
    event.preventDefault();
    const quantity = Number(adjustment.quantity);
    const selectedItem = inventory.find((item) => item.id === adjustment.inventoryId);
    if (!selectedItem || !Number.isInteger(quantity) || quantity <= 0 || !adjustment.reason.trim()) {
      setAdjustmentError('Choose an item, enter a whole quantity, and provide a reason.');
      return;
    }
    const previousQuantity = selectedItem.quantity;
    const newQuantity = adjustment.adjustmentType === 'ADD' ? previousQuantity + quantity : previousQuantity - quantity;
    if (newQuantity < 0) {
      setAdjustmentError(`Cannot remove ${quantity}: only ${previousQuantity} item(s) are in stock.`);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${INVENTORY_API_URL}/${selectedItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ adjustment_type: adjustment.adjustmentType, quantity, reason: adjustment.reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to adjust inventory.');
      const updatedItem = { ...data.inventory, quantity: data.inventory.quantity_available, image: data.inventory.image || groceryImage };
      setInventory((items) => items.map((item) => item.id === selectedItem.id ? updatedItem : item));
      setAdjustmentHistory((history) => [data.adjustment, ...history]);
      closeAdjustmentForm();
    } catch (error) {
      setAdjustmentError(error.message || 'Unable to adjust inventory.');
    }
  };
  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const question = chatQuestion.trim();
    if (!question || isChatLoading) return;
    setChatQuestion('');
    setChatError('');
    setChatMessages((messages) => [...messages, { role: 'user', content: question }]);
    setIsChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(ADMIN_CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: question, conversation_id: chatConversationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail?.[0]?.msg || data.detail || 'Unable to get an answer.');
      setChatConversationId(data.conversation_id || chatConversationId);
      const answer = data.answer || data.response || data.message || data.content || (typeof data === 'string' ? data : 'I could not find an answer.');
      setChatMessages((messages) => [...messages, { role: 'assistant', content: answer }]);
    } catch (error) {
      setChatError(error.message || 'Unable to reach the inventory assistant.');
    } finally {
      setIsChatLoading(false);
    }
  };
  const handleNewChat = () => {
    setChatMessages([{ role: 'assistant', content: 'Ask me about stock levels, products, or inventory trends.' }]);
    setChatConversationId(null);
    setChatError('');
  };

  return <main className="admin-dashboard">
    <header className="admin-header"><div><p className="eyebrow">Store management</p><h1>Inventory dashboard</h1><p className="header-copy">Manage your products, pricing, stock levels, and item images.</p></div><div className="header-actions"><button className="button button-danger" onClick={() => navigate('/login')}>Logout</button><button className="button button-primary" onClick={() => setIsFormOpen(true)}>+ Add item</button><button className="button button-adjust" onClick={() => setIsAdjustmentOpen(true)}>Adjust inventory</button></div></header>
    <section className="inventory-summary" aria-label="Inventory summary"><div><span>Total products</span><strong>{inventory.length}</strong></div><div><span>Low stock</span><strong>{inventory.filter((item) => item.quantity > 0 && item.quantity < 10).length}</strong></div></section>
    <section className="inventory-section"><div className="section-heading"><div><h2>Inventory items</h2><p>{inventory.length} product{inventory.length === 1 ? '' : 's'} in your catalog</p></div></div>{inventory.length ? <div className="inventory-grid">{inventory.map((item) => <article className="inventory-card" key={item.id}><img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.src = groceryImage; }} /><div className="inventory-card-content"><div className="card-topline"><h3>{item.name}</h3><span className={item.quantity === 0 ? 'stock-badge out-of-stock' : item.quantity < 10 ? 'stock-badge low-stock' : 'stock-badge'}>{item.quantity === 0 ? 'Out of stock' : `${item.quantity} available`}</span></div><p className="price">₹{item.price.toFixed(2)}</p><p className="quantity">Quantity: <strong>{item.quantity}</strong></p><div className="card-actions"><button className="text-button edit" onClick={() => handleEdit(item)}>Edit</button><button className="text-button delete" onClick={() => handleDelete(item.id)}>Delete</button></div></div></article>)}</div> : <div className="empty-state"><p>No inventory items yet.</p><button className="button button-primary" onClick={() => setIsFormOpen(true)}>Add your first item</button></div>}</section>
    {isFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={closeForm}><section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Inventory item</p><h2 id="item-form-title">{editingId ? 'Edit item' : 'Add new item'}</h2></div><button className="close-button" aria-label="Close form" onClick={closeForm}>×</button></div><form onSubmit={handleSubmit}><label>Item name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Fresh Apples" /></label><div className="form-row"><label>Price (₹)<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0.00" /></label><label>{editingId ? 'Available quantity' : 'Quantity'}<input required min="0" step="1" type="number" value={form.quantity} readOnly={Boolean(editingId)} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /></label></div>{editingId && <p className="quantity-notice">Available quantity cannot be changed here. Use <strong>Adjust inventory</strong> to add or remove stock.</p>}<label>Image URL <span>(optional)</span><input type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://example.com/product.jpg" /></label>{itemFormError && <p className="adjustment-error" role="alert">{itemFormError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={closeForm}>Cancel</button><button type="submit" className="button button-primary" disabled={isSavingItem}>{isSavingItem ? 'Saving...' : editingId ? 'Save changes' : 'Add item'}</button></div></form></section></div>}
    {isAdjustmentOpen && <div className="modal-backdrop" role="presentation" onMouseDown={closeAdjustmentForm}><section className="item-modal adjustment-modal" role="dialog" aria-modal="true" aria-labelledby="adjustment-form-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Stock control</p><h2 id="adjustment-form-title">Adjust inventory</h2></div><button className="close-button" aria-label="Close adjustment form" onClick={closeAdjustmentForm}>×</button></div><form onSubmit={handleAdjustment}><label>Inventory item<select required value={adjustment.inventoryId} onChange={(event) => setAdjustment({ ...adjustment, inventoryId: event.target.value })}><option value="">Select an item</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} in stock)</option>)}</select></label><div className="form-row"><label>Adjustment type<select value={adjustment.adjustmentType} onChange={(event) => setAdjustment({ ...adjustment, adjustmentType: event.target.value })}><option value="ADD">ADD</option><option value="REMOVE">REMOVE</option></select></label><label>Quantity<input required min="1" step="1" type="number" value={adjustment.quantity} onChange={(event) => setAdjustment({ ...adjustment, quantity: event.target.value })} placeholder="0" /></label></div><label>Reason<input required value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="e.g. New shipment received" /></label>{adjustmentError && <p className="adjustment-error" role="alert">{adjustmentError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={closeAdjustmentForm}>Cancel</button><button type="submit" className="button button-adjust">Apply adjustment</button></div></form></section></div>}
    <aside className={`admin-chat ${isChatOpen ? 'is-open' : ''}`} aria-label="Inventory assistant">
      {isChatOpen && <section className="chat-panel" aria-labelledby="chat-title">
        <div className="chat-heading"><div><p className="eyebrow">Admin assistant</p><h2 id="chat-title">Inventory chat</h2></div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><button className="button button-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={handleNewChat}>New Chat</button><button className="close-button" aria-label="Close inventory chat" onClick={() => setIsChatOpen(false)}>×</button></div></div>
        <div className="chat-messages" aria-live="polite">{chatMessages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'AI' : 'You'}</span><p>{message.content}</p></div>)}{isChatLoading && <div className="chat-message assistant"><span>AI</span><p className="chat-typing">Thinking...</p></div>}</div>
        {chatError && <p className="chat-error" role="alert">{chatError}</p>}
        <form className="chat-form" onSubmit={handleChatSubmit}><input value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} placeholder="Ask about your inventory..." aria-label="Ask the inventory assistant" disabled={isChatLoading} /><button className="button button-primary" type="submit" aria-label="Send question" disabled={isChatLoading || !chatQuestion.trim()}>Send</button></form>
      </section>}
      {!isChatOpen && <button className="chat-launcher" onClick={() => setIsChatOpen(true)} aria-label="Open inventory chat"><span aria-hidden="true">✦</span><span>Ask inventory AI</span></button>}
    </aside>
  </main>;
}
