// ============================================================
// JANJI JUS — app.js (v2) — FIXED QTY & VOUCHER
// ============================================================

(() => {
  const state = {
    config: null,
    qty: 1,
    selectedCourier: 'Direkomendasikan',
    selectedPaytype: null,
    selectedChannel: null,
    voucherApplied: false,
    selectedArea: null,
    pollTimer: null,
  };

  const DISCOUNT_TIERS = { 1: 0, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.15 };
  const MAX_QTY = 5;
  const SHIPPING_FEE = 15000;

  const rupiah = (n) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function calcPricing(basePrice, qty) {
    const discountPercent = DISCOUNT_TIERS[qty] ?? 0;
    const pricePerPcs = Math.round(basePrice * (1 - discountPercent));
    return {
      qty, discountPercent,
      pricePerPcs,
      totalOriginal: basePrice * qty,
      totalDiscounted: pricePerPcs * qty,
    };
  }

  // ---------------------------------------------------------
  // Load config
  // ---------------------------------------------------------
  async function loadConfig() {
    try {
      const res = await fetch(window.GS_API_URL + '?action=config');
      const json = await res.json();
      if (!json.success) throw new Error('Gagal load config');
      state.config = json.data;

      $('#product-name').textContent = state.config.productName;
      $('#product-desc').textContent = state.config.productDescription;

      const waAdmin = state.config.waAdminNumber || state.config.waNumber || '';
      $('#ask-admin-link').href = `https://wa.me/${waAdmin}?text=${encodeURIComponent('Halo min, saya mau tanya-tanya dulu soal produk ini')}`;

      renderCourierOptions();
      renderPaytypeOptions();
      updatePricing();
    } catch (err) {
      console.error('Load config error:', err);
    }
  }

  function renderCourierOptions() {
    const order = [
      { key: 'Direkomendasikan', label: 'Direkomendasikan (JNT)', icon: 'recommended' },
      { key: 'JNT', label: 'JNT', icon: 'jnt' },
      { key: 'SiCepat', label: 'SiCepat', icon: 'sicepat' },
      { key: 'Sap', label: 'Sap', icon: 'sap' },
      { key: 'iDexpress', label: 'iDexpress', icon: 'idexpress' },
    ];
    const container = $('#courier-group');
    if (!container) return;
    container.innerHTML = '';
    order.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (c.key === 'Direkomendasikan' ? ' recommended' : '') + (c.key === state.selectedCourier ? ' selected' : '');
      btn.innerHTML = `<span class="icon-box"><img src="./assets/img/couriers/${c.icon}.png" alt="" onerror="this.parentElement.innerHTML='🚚';"></span>${c.label}`;
      btn.addEventListener('click', () => {
        state.selectedCourier = c.key;
        $$('#courier-group .pill').forEach((p) => p.classList.remove('selected'));
        btn.classList.add('selected');
      });
      container.appendChild(btn);
    });
  }

  const PAYTYPE_OPTIONS = [
    { key: 'COD', kodeChannel: null, label: 'COD', sub: 'Bayar ke kurir/outlet', icon: 'cod' },
    { key: 'QRIS', kodeChannel: 'QRIS_CUSTOM', label: 'QRIS', sub: 'Semua e-wallet', icon: 'qris' },
    { key: 'MANDIRI', kodeChannel: 'MANDIRI', label: 'Mandiri VA', sub: 'Virtual Account', icon: 'mandiri' },
    { key: 'BCA', kodeChannel: 'BCA', label: 'BCA VA', sub: 'Virtual Account', icon: 'bca' },
    { key: 'BNI', kodeChannel: 'BNI', label: 'BNI VA', sub: 'Virtual Account', icon: 'bni' },
    { key: 'BRI', kodeChannel: 'BRI', label: 'BRI VA', sub: 'Virtual Account', icon: 'bri' },
    { key: 'BSI', kodeChannel: 'BSI', label: 'BSI VA', sub: 'Virtual Account', icon: 'bsi' },
    { key: 'ALFAMART', kodeChannel: 'ALFAMART', label: 'Alfamart', sub: 'Bayar di gerai', icon: 'alfamart' },
    { key: 'INDOMARET', kodeChannel: 'INDOMARET', label: 'Indomaret', sub: 'Bayar di gerai', icon: 'indomaret' },
  ];

  function renderPaytypeOptions() {
    const container = $('#paytype-group');
    if (!container) return;
    container.innerHTML = '';
    PAYTYPE_OPTIONS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="icon-box"><img src="./assets/img/payment/${opt.icon}.png" alt="" onerror="this.parentElement.innerHTML='💳';"></span><span class="label-col">${opt.label}<span class="sub">${opt.sub}</span></span>`;
      btn.addEventListener('click', () => {
        state.selectedPaytype = opt.key;
        state.selectedChannel = opt.kodeChannel;
        $$('#paytype-group .option-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        $('#err-channel').classList.remove('show');
      });
      container.appendChild(btn);
    });
  }

  function resolveChannelForPaytype() {
    return state.selectedPaytype === 'COD' ? null : state.selectedChannel;
  }

  // ---------------------------------------------------------
  // Qty & pricing display — FIXED VOUCHER
  // ---------------------------------------------------------
  function updatePricing() {
    if (!state.config) return;
    const p = calcPricing(state.config.productPrice, state.qty);

    // Update qty display
    const qtyEl = $('#qty-val');
    if (qtyEl) qtyEl.textContent = state.qty;
    const plusBtn = $('#qty-plus');
    const minusBtn = $('#qty-minus');
    if (plusBtn) plusBtn.disabled = state.qty >= MAX_QTY;
    if (minusBtn) minusBtn.disabled = state.qty <= 1;

    // Harga produk
    const priceFinal = $('#price-final');
    const priceStrike = $('#price-strike');
    const discountChip = $('#discount-chip');
    if (priceFinal) priceFinal.textContent = rupiah(p.totalDiscounted);
    if (p.discountPercent > 0) {
      if (priceStrike) { priceStrike.style.visibility = 'visible'; priceStrike.textContent = rupiah(p.totalOriginal); }
      if (discountChip) { discountChip.style.display = 'inline-block'; discountChip.textContent = `Hemat ${Math.round(p.discountPercent * 100)}%`; }
    } else {
      if (priceStrike) priceStrike.style.visibility = 'hidden';
      if (discountChip) discountChip.style.display = 'none';
    }

    // Subtotal
    const sumLabel = $('#sum-product-label');
    const sumSubtotal = $('#sum-subtotal');
    if (sumLabel) sumLabel.textContent = `${state.config.productName} × ${state.qty}`;
    if (sumSubtotal) {
      sumSubtotal.innerHTML = p.discountPercent > 0
        ? `<span class="strike">${rupiah(p.totalOriginal)}</span> ${rupiah(p.totalDiscounted)}`
        : rupiah(p.totalDiscounted);
    }

    // Ongkir + Voucher
    const shippingEl = $('#sum-shipping');
    const voucherBtn = $('#voucher-btn');
    if (state.voucherApplied) {
      if (shippingEl) shippingEl.innerHTML = '<span class="strike">Rp15.000</span> GRATIS';
      if (voucherBtn) { voucherBtn.classList.add('applied'); voucherBtn.textContent = '✅ Voucher Gratis Ongkir Terpakai'; }
    } else {
      if (shippingEl) shippingEl.textContent = 'Rp15.000';
      if (voucherBtn) { voucherBtn.classList.remove('applied'); voucherBtn.textContent = '🎟️ Pakai Voucher Gratis Ongkir'; }
    }

    // Total = subtotal + (voucher ? 0 : 15000)
    const total = p.totalDiscounted + (state.voucherApplied ? 0 : SHIPPING_FEE);
    const totalEl = $('#sum-total');
    if (totalEl) totalEl.textContent = rupiah(total);

    // Sticky footer
    const stickyPrice = $('#sticky-price');
    const stickyStrike = $('#sticky-strike');
    if (stickyPrice) stickyPrice.textContent = rupiah(total);
    if (stickyStrike) {
      if (p.discountPercent > 0) {
        stickyStrike.style.display = 'block';
        stickyStrike.textContent = rupiah(p.totalOriginal + (state.voucherApplied ? 0 : SHIPPING_FEE));
      } else {
        stickyStrike.style.display = 'none';
      }
    }

    // Footer (fixed bottom)
    const footerOriginal = $('#footer-original');
    const footerDiscount = $('#footer-discount');
    if (footerOriginal) footerOriginal.textContent = rupiah(p.totalOriginal);
    if (footerDiscount) footerDiscount.textContent = rupiah(total);
  }

  // ---------------------------------------------------------
  // QTY EVENT LISTENERS (PASTIKAN TERIKAT)
  // ---------------------------------------------------------
  function initQty() {
    const plusBtn = $('#qty-plus');
    const minusBtn = $('#qty-minus');
    if (plusBtn) {
      plusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (state.qty < MAX_QTY) {
          state.qty += 1;
          updatePricing();
        } else {
          alert('Maksimal pembelian 5 pcs');
        }
      });
    }
    if (minusBtn) {
      minusBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (state.qty > 1) {
          state.qty -= 1;
          updatePricing();
        }
      });
    }
  }

  // ---------------------------------------------------------
  // VOUCHER EVENT
  // ---------------------------------------------------------
  function initVoucher() {
    const voucherBtn = $('#voucher-btn');
    if (voucherBtn) {
      voucherBtn.addEventListener('click', function(e) {
        e.preventDefault();
        state.voucherApplied = !state.voucherApplied;
        updatePricing();
      });
    }
  }

  // ---------------------------------------------------------
  // Countdown gimmick
  // ---------------------------------------------------------
  function startCountdown() {
    let seconds = 10 * 60;
    const el = $('#countdown-timer');
    if (!el) return;
    setInterval(() => {
      seconds -= 1;
      if (seconds < 0) seconds = 10 * 60;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }, 1000);
  }

  // ---------------------------------------------------------
  // Fake purchase notification
  // ---------------------------------------------------------
  const FAKE_FULL_NAMES = [
    'Ahmad Fauzi', 'Dewi Sartika', 'Budi Santoso', 'Rina Anggraini', 'Fajar Ramadhan',
    'Nurul Hikmah', 'Agus Salim', 'Siti Aisyah', 'Andi Pratama', 'Mega Lestari',
    'Rudi Hartono', 'Lisa Permata', 'Doni Saputra', 'Winda Sari', 'Hendra Wijaya',
    'Rizky Amelia', 'Gilang Nugroho', 'Diana Putri', 'Eko Prasetyo', 'Maya Sari'
  ];
  const FAKE_CITIES = ['Bandung', 'Jakarta', 'Surabaya', 'Semarang', 'Medan', 'Sukabumi', 'Bekasi', 'Depok', 'Malang', 'Makassar'];

  function maskWord(word) {
    if (word.length <= 3) return word[0] + '*'.repeat(word.length - 1);
    return word.slice(0, 2) + '*' + word.slice(-2);
  }
  function maskFullName(name) {
    return name.split(' ').map(maskWord).join(' ');
  }

  function showFakeNotif() {
    const name = FAKE_FULL_NAMES[Math.floor(Math.random() * FAKE_FULL_NAMES.length)];
    const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
    const minutes = Math.floor(Math.random() * 14) + 1;
    $('#fn-name').textContent = maskFullName(name);
    $('#fn-city').textContent = city;
    $('#fn-time').textContent = `${minutes} menit`;
    const el = $('#fake-notif');
    if (el) {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 4200);
    }
  }

  function startFakeNotifLoop() {
    setTimeout(showFakeNotif, 3000);
    setInterval(showFakeNotif, 9000 + Math.random() * 5000);
  }

  // ---------------------------------------------------------
  // Sticky bottom bar
  // ---------------------------------------------------------
  function initStickyBar() {
    const bar = $('#sticky-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      bar.classList.toggle('show', window.scrollY > 420);
    });
    const cta = $('#sticky-cta');
    if (cta) {
      cta.addEventListener('click', () => {
        $('#submit-btn').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  // ---------------------------------------------------------
  // FAQ accordion
  // ---------------------------------------------------------
  $$('#faq-card .faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    if (q) q.addEventListener('click', () => item.classList.toggle('open'));
  });

  // ---------------------------------------------------------
  // Autocomplete alamat (sama seperti sebelumnya)
  // ---------------------------------------------------------
  let acDebounce = null;
  const searchInput = $('#f-search-area');
  const acResults = $('#ac-results');

  if (searchInput && acResults) {
    searchInput.addEventListener('input', () => {
      clearTimeout(acDebounce);
      const keyword = searchInput.value.trim();
      state.selectedArea = null;
      $('#area-readout').style.display = 'none';
      if (keyword.length < 3) { acResults.classList.remove('show'); return; }
      acDebounce = setTimeout(() => fetchAreaSuggestions(keyword), 350);
    });

    async function fetchAreaSuggestions(keyword) {
      try {
        const url = window.GS_API_URL + '?action=address-search&keyword=' + encodeURIComponent(keyword);
        const res = await fetch(url);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        renderAreaSuggestions(json.data || []);
      } catch (e) {
        acResults.innerHTML = `<div class="ac-item">Gagal mencari alamat: ${e.message || 'coba lagi'}</div>`;
        acResults.classList.add('show');
      }
    }

    function renderAreaSuggestions(items) {
      if (!items.length) {
        acResults.innerHTML = `<div class="ac-item">Tidak ditemukan, coba kata kunci lain.</div>`;
        acResults.classList.add('show');
        return;
      }
      acResults.innerHTML = '';
      items.slice(0, 15).forEach((item) => {
        const div = document.createElement('div');
        div.className = 'ac-item';
        div.innerHTML = `<div>${item.SUBDISTRICT_NAME || ''}, ${item.DISTRICT_NAME || ''}</div><div class="small">${item.CITY_NAME || ''}, ${item.PROVINCE_NAME || ''} — ${item.ZIP_CODE || ''}</div>`;
        div.addEventListener('click', () => selectArea(item));
        acResults.appendChild(div);
      });
      acResults.classList.add('show');
    }

    function selectArea(item) {
      state.selectedArea = item;
      searchInput.value = `${item.SUBDISTRICT_NAME || ''}, ${item.DISTRICT_NAME || ''}, ${item.CITY_NAME || ''}`;
      acResults.classList.remove('show');
      $('#area-readout').style.display = 'grid';
      $('#ro-province').textContent = item.PROVINCE_NAME || '-';
      $('#ro-city').textContent = item.CITY_NAME || '-';
      $('#ro-district').textContent = item.DISTRICT_NAME || '-';
      $('#ro-subdistrict').textContent = item.SUBDISTRICT_NAME || '-';
      $('#err-area').classList.remove('show');
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.autocomplete')) acResults.classList.remove('show');
    });
  }

  // ---------------------------------------------------------
  // Validasi & submit
  // ---------------------------------------------------------
  function toggleError(sel, show) {
    const el = $(sel);
    if (!el) return false;
    if (show) el.classList.add('show'); else el.classList.remove('show');
    return show;
  }

  function validate() {
    const name = $('#f-name').value.trim();
    const phone = $('#f-phone').value.replace(/\D/g, '');
    const address = $('#f-address').value.trim();
    const channelReady = state.selectedPaytype && (state.selectedPaytype !== 'VA' || state.selectedChannel);

    const hasErr = [
      toggleError('#err-name', !name),
      toggleError('#err-phone', phone.length < 9 || phone.length > 15),
      toggleError('#err-area', !state.selectedArea),
      toggleError('#err-address', !address),
      toggleError('#err-channel', !channelReady),
    ].some(Boolean);

    return !hasErr;
  }

  async function handleCheckout() {
    if (!validate()) {
      $('#form-msg').textContent = 'Cek lagi form-nya, ada yang belum lengkap.';
      $('#form-msg').classList.add('show');
      return;
    }
    $('#form-msg').classList.remove('show');
    $('#submit-btn').disabled = true;
    $('#submit-btn').textContent = 'Memproses…';

    const paymentType = state.selectedPaytype === 'COD' ? 'COD' : 'NONCOD';
    const paymentChannel = resolveChannelForPaytype();

    const payload = {
      customerName: $('#f-name').value.trim(),
      customerPhone: $('#f-phone').value.replace(/\D/g, ''),
      province: state.selectedArea.PROVINCE_NAME,
      city: state.selectedArea.CITY_NAME,
      district: state.selectedArea.DISTRICT_NAME,
      subdistrict: state.selectedArea.SUBDISTRICT_NAME,
      addressDetail: $('#f-address').value.trim(),
      destinationAddressId: state.selectedArea._id,
      qty: state.qty,
      courierChoice: state.selectedCourier,
      paymentType,
      paymentChannel,
    };

    try {
      const url = window.GS_API_URL + '?action=create-order';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Checkout gagal');

      if (paymentType === 'COD') {
        window.location.href = `./tracking.html?order=${encodeURIComponent(json.orderId)}`;
        return;
      }

      // NONCOD: tampilkan layar pembayaran
      renderPaymentScreen(json);
      $$('.screen').forEach((s) => s.classList.remove('active'));
      $('#screen-payment').classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startPolling(json.orderId);
    } catch (err) {
      $('#form-msg').textContent = err.message || 'Terjadi kesalahan, coba lagi.';
      $('#form-msg').classList.add('show');
    } finally {
      $('#submit-btn').disabled = false;
      $('#submit-btn').textContent = 'Checkout Sekarang';
    }
  }

  // ---------------------------------------------------------
  // Payment screen
  // ---------------------------------------------------------
  function renderPaymentScreen(json) {
    const p = json.payment || {};
    $('#pay-order-id').textContent = json.orderId;
    $('#pay-total-val').textContent = rupiah(p.total_amount ?? json.totalPrice);

    $('#pay-qris').style.display = 'none';
    $('#pay-va').style.display = 'none';
    $('#pay-retail').style.display = 'none';
    $('#pay-steps').innerHTML = '';
    const extLink = $('#pay-external-link');
    if (p.checkout_url) { extLink.href = p.checkout_url; extLink.style.display = 'inline'; }
    else { extLink.style.display = 'none'; }

    if (p.qrUrl) {
      $('#pay-qris').style.display = 'block';
      $('#pay-qr-img').src = p.qrUrl;
      setSteps([
        'Screenshot atau scan langsung kode QR di atas',
        'Buka aplikasi dompet digital (Dana, Gopay, OVO, ShopeePay, dll)',
        'Pilih menu Scan QR, lalu scan kode QRIS di atas',
        'Pastikan nominal & data transaksi sudah sesuai',
        'Selesaikan pembayaran, halaman ini otomatis update',
      ]);
    } else if (p.va_number) {
      $('#pay-va').style.display = 'block';
      $('#pay-va-bank').textContent = p.bank_name || p.bank || 'Virtual Account';
      $('#pay-va-number').textContent = p.va_number;
      setSteps([
        'Buka aplikasi mobile banking sesuai bank di atas',
        'Pilih menu Transfer / Virtual Account',
        'Masukkan nomor Virtual Account di atas',
        'Masukkan nominal sesuai Total Bayar',
        'Konfirmasi dan selesaikan pembayaran',
      ]);
    } else if (p.payment_code) {
      $('#pay-retail').style.display = 'block';
      $('#pay-retail-name').textContent = p.retail_name || 'Retail';
      $('#pay-retail-code').textContent = p.payment_code;
      setSteps([
        `Datang ke gerai ${p.retail_name || 'retail'} terdekat`,
        'Sampaikan ke kasir ingin melakukan pembayaran',
        'Sebutkan kode pembayaran di atas',
        'Bayar sesuai nominal Total Bayar',
        'Simpan bukti pembayaran Anda',
      ]);
    }
  }

  function setSteps(items) {
    $('#pay-steps').innerHTML = items.map((s) => `<li>${s}</li>`).join('');
  }

  $('#pay-va-copy')?.addEventListener('click', () => copyText($('#pay-va-number').textContent));
  $('#pay-retail-copy')?.addEventListener('click', () => copyText($('#pay-retail-code').textContent));
  function copyText(text) { navigator.clipboard?.writeText(text).catch(() => {}); }

  function startPolling(orderId) {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(async () => {
      try {
        const url = window.GS_API_URL + '?action=check-status&orderId=' + encodeURIComponent(orderId);
        const res = await fetch(url);
        const json = await res.json();
        if (!json.success) return;
        if (json.paymentStatus === 'PAID' || json.paymentStatus === 'PAID_PENDING_SYNC') {
          clearInterval(state.pollTimer);
          window.location.href = `./tracking.html?order=${encodeURIComponent(orderId)}`;
        }
      } catch (e) { /* coba lagi */ }
    }, 4000);
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    initQty();
    initVoucher();
    startCountdown();
    startFakeNotifLoop();
    initStickyBar();

    // Tombol submit
    const submitBtn = $('#submit-btn');
    if (submitBtn) submitBtn.addEventListener('click', handleCheckout);

    const footerBtn = $('#btn-checkout-footer');
    if (footerBtn) footerBtn.addEventListener('click', handleCheckout);

    // Tracking header
    const trackHeader = $('#btn-track-header');
    if (trackHeader) {
      trackHeader.addEventListener('click', function() {
        showSection('tracking');
        const resultDiv = $('#tracking-result');
        if (resultDiv) resultDiv.style.display = 'none';
      });
    }

    // Tracking submit
    const trackSubmit = $('#btn-track-submit');
    if (trackSubmit) trackSubmit.addEventListener('click', handleTracking);

    // Back buttons
    const backHome = $('#btn-back-home');
    if (backHome) backHome.addEventListener('click', function() { showSection('landing'); });
    const backHomePacked = $('#btn-back-home-packed');
    if (backHomePacked) backHomePacked.addEventListener('click', function() { showSection('landing'); });
    const backHomeTrack = $('#btn-back-home-track');
    if (backHomeTrack) backHomeTrack.addEventListener('click', function() { showSection('landing'); });
    const btnHome = $('#btn-home');
    if (btnHome) {
      btnHome.addEventListener('click', function(e) {
        e.preventDefault();
        showSection('landing');
      });
    }
  });

  // ===== SHOW SECTION =====
  function showSection(id) {
    const sections = {
      landing: document.getElementById('section-landing'),
      payment: document.getElementById('section-payment'),
      packed: document.getElementById('section-packed'),
      tracking: document.getElementById('section-tracking'),
    };
    Object.keys(sections).forEach(key => {
      if (sections[key]) {
        sections[key].classList.toggle('active', key === id);
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== HANDLE TRACKING =====
  async function handleTracking() {
    const noHp = document.getElementById('track-phone').value.trim();
    if (!noHp) {
      alert('Masukkan No HP!');
      return;
    }

    try {
      const url = window.GS_API_URL + '?action=track-order&phone=' + encodeURIComponent(noHp);
      const res = await fetch(url);
      const result = await res.json();
      const resultDiv = document.getElementById('tracking-result');
      if (!resultDiv) return;

      if (result.success && result.orders && result.orders.length > 0) {
        let html = '';
        result.orders.forEach(order => {
          let status = order.shippingStatus || 'DIKEMAS';
          let step = 1;
          if (status === 'DIKIRIM') step = 2;
          else if (status === 'DITERIMA') step = 3;
          else if (status === 'MENUNGGU_PEMBAYARAN') step = 0;

          html += `<div class="tracking-item">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Resi:</strong> ${order.cnoteNo || '-'}</p>
            <p><strong>Kurir:</strong> ${order.courierChoice || '-'}</p>
            <p><strong>Total:</strong> Rp ${(order.totalPrice || 0).toLocaleString()}</p>
            <div class="tracking-progress">
              <div class="tracking-step ${step >= 1 ? 'done' : ''}">
                <div class="step-icon"><i class="fas fa-box"></i></div>
                <span class="step-label">Dikemas</span>
              </div>
              <div class="tracking-step ${step >= 2 ? 'done' : ''}">
                <div class="step-icon"><i class="fas fa-truck"></i></div>
                <span class="step-label">Dikirim</span>
              </div>
              <div class="tracking-step ${step >= 3 ? 'done' : ''}">
                <div class="step-icon"><i class="fas fa-check-circle"></i></div>
                <span class="step-label">Diterima</span>
              </div>
            </div>
          </div>`;
        });
        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
      } else {
        resultDiv.innerHTML = `<p style="color:red;">${result.message || 'Pesanan tidak ditemukan'}</p>`;
        resultDiv.style.display = 'block';
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // ===== SHOW PACKED PAGE (dipanggil dari tracking atau checkout) =====
  // Fungsi ini dipanggil dari tracking.js atau dari app.js jika diperlukan
  window.showPackedPage = function(data) {
    showSection('packed');
    const elements = {
      'packed-order-id': data.orderId,
      'packed-resi': data.resi || '-',
      'packed-courier': data.kurir,
      'packed-total': data.totalHarga.toLocaleString(),
      'packed-method': data.metodeBayar,
    };
    Object.keys(elements).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = elements[id];
    });

    const btnWa = document.getElementById('btn-wa-packed');
    if (btnWa) {
      btnWa.onclick = () => {
        const pesan =
          `Halo ${data.nama},\n\nPesanan Anda (${data.orderId}) sudah dikemas.\nResi: ${data.resi || '-'}\nTotal: Rp ${data.totalHarga.toLocaleString()}\nKurir: ${data.kurir}\n\nTerima kasih!`;
        const url = `https://wa.me/${data.noHp.replace(/^0+/, '')}?text=${encodeURIComponent(pesan)}`;
        window.open(url, '_blank');
      };
    }

    const btnConfirm = document.getElementById('btn-confirm-shipped');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        const pesanAdmin =
          `Halo Admin,\n\nSaya sudah mengantarkan paket ke outlet ekspedisi.\nOrder ID: ${data.orderId}\nResi: ${data.resi}\nKurir: ${data.kurir}\n\nMohon update status di spreadsheet menjadi "sudah_dikirim = TRUE".`;
        const url = `https://wa.me/${window.WA_ADMIN || '6281932696934'}?text=${encodeURIComponent(pesanAdmin)}`;
        window.open(url, '_blank');
        alert('✅ Kirim pesan ke admin. Jangan lupa update spreadsheet!');
      };
    }
  };
})();