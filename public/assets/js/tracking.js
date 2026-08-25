// ============================================================
// JANJI JUS — tracking.js (FIXED)
// ============================================================

(() => {
  const $ = (s) => document.querySelector(s);
  const rupiah = (n) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
  let cameFromOrderParam = false;

  function showOnly(id) {
    ['search-card', 'order-list-card', 'detail-card'].forEach((x) => {
      const el = $(`#${x}`);
      if (el) el.style.display = x === id ? 'block' : 'none';
    });
  }

  const PAYMENT_LABELS = {
    COD: 'COD (Bayar di Tempat)',
    QRIS_CUSTOM: 'QRIS',
    MANDIRI: 'Mandiri VA',
    BCA: 'BCA VA',
    BNI: 'BNI VA',
    BRI: 'BRI VA',
    BSI: 'BSI VA',
    ALFAMART: 'Alfamart',
    INDOMARET: 'Indomaret',
  };

  function renderTimeline(shippingStatus) {
    const waitingBox = $('#waiting-payment-box');
    const timelineBox = $('#timeline-box');

    if (shippingStatus === 'MENUNGGU_PEMBAYARAN') {
      if (waitingBox) waitingBox.style.display = 'block';
      if (timelineBox) timelineBox.style.display = 'none';
      return;
    }
    if (waitingBox) waitingBox.style.display = 'none';
    if (timelineBox) timelineBox.style.display = 'block';

    const steps = ['DIKEMAS', 'DIKIRIM', 'DITERIMA'];
    const idx = steps.indexOf(shippingStatus);
    steps.forEach((s, i) => {
      const el = $(`#tl-step-${i + 1}`);
      if (el) {
        el.classList.remove('done', 'current');
        if (i < idx) el.classList.add('done');
        else if (i === idx) el.classList.add('current', 'done');
      }
    });
    const pct = idx <= 0 ? 0 : idx === 1 ? 50 : 100;
    const progress = $('#tl-progress');
    if (progress) progress.style.width = `${pct}%`;
  }

  function renderDetail(order) {
    showOnly('detail-card');
    const backBtn = $('#back-to-list');
    if (backBtn) backBtn.textContent = cameFromOrderParam ? '🛒 Belanja Lagi' : '← Kembali ke daftar';
    const orderIdEl = $('#d-order-id');
    if (orderIdEl) orderIdEl.textContent = order.orderId;
    const resiEl = $('#d-resi');
    if (resiEl) resiEl.textContent = order.cnoteNo || 'Menyiapkan resi…';
    const productEl = $('#d-product');
    if (productEl) productEl.textContent = `${order.productName || 'Janji Jus'} × ${order.qty || 1}`;
    const totalEl = $('#d-total');
    if (totalEl) totalEl.textContent = rupiah(order.totalPrice);
    const paymentEl = $('#d-payment');
    if (paymentEl) paymentEl.textContent = PAYMENT_LABELS[order.paymentChannel] || order.paymentType || '-';
    renderTimeline(order.shippingStatus || 'DIKEMAS');

    const waAdmin = window.__JJ_WA_ADMIN__ || '';
    const waBtn = $('#d-wa-btn');
    if (waBtn) {
      const msg = `Halo, saya mau tanya soal pesanan saya.\nOrder ID: ${order.orderId}`;
      waBtn.href = waAdmin ? `https://wa.me/${waAdmin}?text=${encodeURIComponent(msg)}` : '#';
    }
  }

  function renderOrderList(orders) {
    showOnly('order-list-card');
    const container = $('#order-list');
    if (!container) return;
    container.innerHTML = '';
    const STATUS_LABELS = { MENUNGGU_PEMBAYARAN: 'MENUNGGU PEMBAYARAN', DIKEMAS: 'DIKEMAS', DIKIRIM: 'DIKIRIM', DITERIMA: 'DITERIMA' };
    orders.forEach((o) => {
      const div = document.createElement('div');
      div.className = 'order-list-item';
      const chipClass = o.shippingStatus === 'MENUNGGU_PEMBAYARAN' ? 'status-chip pending' : 'status-chip';
      div.innerHTML = `
        <div class="oid">${o.orderId}</div>
        <div class="meta">${o.productName || 'Janji Jus'} × ${o.qty} — ${rupiah(o.totalPrice)}</div>
        <div class="${chipClass}">${STATUS_LABELS[o.shippingStatus] || o.shippingStatus}</div>
      `;
      div.addEventListener('click', () => renderDetail(o));
      container.appendChild(div);
    });
  }

  async function loadWaAdmin() {
    try {
      const url = window.GS_API_URL + '?action=config';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        window.__JJ_WA_ADMIN__ = json.data.waAdminNumber || json.data.waNumber || '';
      }
    } catch (e) { /* diamkan */ }
  }

  async function searchByPhone(phone) {
    const msgEl = $('#search-msg');
    if (msgEl) msgEl.classList.remove('show');
    try {
      const url = window.GS_API_URL + '?action=track-order&phone=' + encodeURIComponent(phone);
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      if (!json.orders || json.orders.length === 0) {
        if (msgEl) {
          msgEl.textContent = 'Tidak ada pesanan ditemukan untuk nomor ini.';
          msgEl.classList.add('show');
        }
        return;
      }
      if (json.orders.length === 1) {
        renderDetail(json.orders[0]);
      } else {
        renderOrderList(json.orders);
      }
    } catch (e) {
      if (msgEl) {
        msgEl.textContent = e.message || 'Gagal mencari pesanan.';
        msgEl.classList.add('show');
      }
    }
  }

  async function loadByOrderId(orderId) {
    try {
      const url = window.GS_API_URL + '?action=check-status&orderId=' + encodeURIComponent(orderId);
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      renderDetail({
        orderId: json.orderId,
        productName: json.productName,
        qty: json.qty,
        totalPrice: json.totalPrice,
        paymentType: json.paymentType,
        shippingStatus: json.shippingStatus,
        cnoteNo: json.cnoteNo,
        paymentChannel: json.paymentChannel,
      });
    } catch (e) {
      showOnly('search-card');
      const msgEl = $('#search-msg');
      if (msgEl) {
        msgEl.textContent = 'Order tidak ditemukan, coba cari lewat nomor HP.';
        msgEl.classList.add('show');
      }
    }
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = $('#search-btn');
    const phoneInput = $('#phone-input');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        if (phone.length < 9) {
          const msgEl = $('#search-msg');
          if (msgEl) {
            msgEl.textContent = 'Nomor HP tidak valid.';
            msgEl.classList.add('show');
          }
          return;
        }
        searchByPhone(phone);
      });
    }
    if (phoneInput) {
      phoneInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && searchBtn) searchBtn.click(); });
    }

    const backSearch = $('#back-to-search');
    if (backSearch) backSearch.addEventListener('click', () => showOnly('search-card'));

    const backList = $('#back-to-list');
    if (backList) {
      backList.addEventListener('click', () => {
        if (cameFromOrderParam) {
          window.location.href = './index.html';
          return;
        }
        const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        if (phone) searchByPhone(phone);
        else showOnly('search-card');
      });
    }

    loadWaAdmin();

    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order');
    if (orderIdParam) {
      cameFromOrderParam = true;
      loadByOrderId(orderIdParam);
    } else {
      showOnly('search-card');
    }
  });
})();