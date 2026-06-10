import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Trash2, CheckCircle, Clock, Calendar, Smartphone, Plus } from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function App() {
  const [waStatus, setWaStatus] = useState({ ready: false, qr: null });
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchWaStatus, 5000);
    fetchWaStatus();
    return () => clearInterval(interval);
  }, []);

  const fetchWaStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/whatsapp/status`);
      setWaStatus(res.data);
    } catch (error) {
      console.error('Error fetching WA status:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/tasks`, formData);
      setFormData({ title: '', description: '', deadline: '', phone: '' });
      fetchTasks();
    } catch (error) {
      alert('Gagal menambahkan tugas');
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await axios.patch(`${API_URL}/tasks/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      alert('Gagal mengupdate status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus tugas ini?')) {
      try {
        await axios.delete(`${API_URL}/tasks/${id}`);
        fetchTasks();
      } catch (error) {
        alert('Gagal menghapus tugas');
      }
    }
  };

  return (
    <div className="app-container">
      {/* Left Column: Form & WA Status */}
      <div className="glass-panel animate-fade-in">
        <h2>WhatsApp Bot Status</h2>
        <div style={{ marginBottom: '2rem' }}>
          {waStatus.ready ? (
            <div className="status-badge success">
              <CheckCircle size={14} /> Terhubung & Siap
            </div>
          ) : (
            <div className="status-badge warning">
              <Clock size={14} /> Menunggu Koneksi...
            </div>
          )}
          
          {!waStatus.ready && waStatus.qr && (
            <div className="qr-container">
              <p style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>Scan QR Code ini menggunakan WhatsApp (Tautkan Perangkat) di HP Anda.</p>
              <QRCodeSVG value={waStatus.qr} size={200} />
            </div>
          )}
          {!waStatus.ready && !waStatus.qr && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div className="loader"></div>
            </div>
          )}
        </div>

        <h2>Tambah Tugas Baru</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Judul Tugas</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange} 
              placeholder="Contoh: Revisi Bab 1 Skripsi" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Deskripsi (Opsional)</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Detail tugas..." 
              rows="3" 
            />
          </div>
          <div className="form-group">
            <label>Waktu Deadline</label>
            <input 
              type="datetime-local" 
              name="deadline" 
              value={formData.deadline} 
              onChange={handleInputChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Nomor WhatsApp Tujuan</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleInputChange} 
              placeholder="Contoh: 081234567890" 
              required 
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? <div className="loader"></div> : <><Plus size={18} /> Simpan Tugas</>}
          </button>
        </form>
      </div>

      {/* Right Column: Task List */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h2>Daftar Tugas & Deadline</h2>
        <div className="task-list">
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Belum ada tugas. Silakan tambahkan tugas baru.</p>
          ) : (
            tasks.map(task => {
              const isCompleted = task.status === 'completed';
              return (
                <div key={task.id} className={`task-item ${isCompleted ? 'completed' : ''}`}>
                  <div className="task-content">
                    <div className="task-title">
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{task.title}</h3>
                      <span className={`status-badge ${isCompleted ? 'success' : 'warning'}`} style={{ marginLeft: 'auto' }}>
                        ID: {task.id}
                      </span>
                    </div>
                    {task.description && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{task.description}</p>
                    )}
                    <div className="task-meta">
                      <span><Calendar size={14} /> {new Date(task.deadline).toLocaleString('id-ID')}</span>
                      <span><Smartphone size={14} /> {task.phone}</span>
                    </div>
                  </div>
                  <div className="task-actions" style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <button 
                      type="button" 
                      className={isCompleted ? 'btn-danger' : 'btn-success'} 
                      onClick={() => handleStatusChange(task.id, task.status)}
                      title={isCompleted ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                    >
                      {isCompleted ? <Clock size={16} /> : <CheckCircle size={16} />}
                    </button>
                    <button 
                      type="button" 
                      className="btn-danger" 
                      onClick={() => handleDelete(task.id)}
                      title="Hapus Tugas"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
