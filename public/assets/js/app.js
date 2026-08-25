// ============================================================
// JANJI JUS — app.js (v3) - FIXED
// ============================================================

(() => {
  // ===== KONFIGURASI =====
  const GS_API_URL = window.GS_API_URL || '';

  if (!GS_API_URL) {
    console.error('❌ GS_API_URL tidak diset! Tambahkan di window.GS_API_URL');
  }

  // ===== STATE =====
  const state = {
    config: null,
    qty: 1,
    selectedCourier: 'JNT',
    selectedPaytype: 'COD',
    selectedChannel: null,
    voucherApplied: false,
    selectedArea: null,
    pollTimer: null,
    isProcessing: false,
  };

  const DISCOUNT_TIERS = { 1: 0, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.15 };
  const MAX_QTY = 5;

  const rupiah = (n) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ============================================================
  // PRICING
  // ============================================================
  function calcPricing(basePrice, qty) {
    const discountPercent = DISCOUNT_TIERS[qty] ?? 0;
    const pricePerPcs = Math.round(basePrice * (1 - discountPercent));
    return {
      qty,
      discountPercent,
      pricePerPcs,
      totalOriginal: basePrice * qty,
      totalDiscounted: pricePerPcs * qty,
    };
  }

  // ============================================================
  // UPDATE PRICE DISPLAY
  // ============================================================
  function updatePricing() {
    if (!state.config) return;
    const basePrice = state.config.productPrice || 209000;
    const p = calcPricing(basePrice, state.qty);

    const shipping = state.voucherApplied ? 0 : 15000;
    const total = p.totalDiscounted + shipping;

    // Qty display
    const qtyVal = $('#qty-val') || $('#qty-display');
    if (qtyVal) qtyVal.textContent = state.qty;

    // Tombol +/-
    const qtyPlus = $('#qty-plus') || document.getElementById('btn-plus');
    const qtyMinus = $('#qty-minus') || document.getElementById('btn-minus');
    if (qtyPlus) qtyPlus.disabled = state.qty >= MAX_QTY;
    if (qtyMinus) qtyMinus.disabled = state.qty <= 1;

    // Harga
    const priceFinal = $('#price-final') || $('#price-discount');
    const priceStrike = $('#price-strike') || $('#price-original');
    const discountChip = $('#discount-chip');

    if (priceFinal) priceFinal.textContent = rupiah(p.totalDiscounted);
    if (priceStrike) {
      if (p.discountPercent > 0) {
        priceStrike.style.visibility = 'visible';
        priceStrike.textContent = rupiah(p.totalOriginal);
      } else {
        priceStrike.style.visibility = 'hidden';
      }
    }
    if (discountChip) {
      if (p.discountPercent > 0) {
        discountChip.style.display = 'inline-block';
        discountChip.textContent = `Hemat ${Math.round(p.discountPercent * 100)}%`;
      } else {
        discountChip.style.display = 'none';
      }
    }

    // Subtotal
    const sumProduct = $('#sum-product-label');
    const sumSubtotal = $('#sum-subtotal');
    const sumShipping = $('#sum-shipping');
    const sumTotal = $('#sum-total');

    if (sumProduct) sumProduct.textContent = `${state.config.productName || 'Spray Tidur'} × ${state.qty}`;
    if (sumSubtotal) {
      sumSubtotal.innerHTML = p.discountPercent > 0
        ? `<span class="strike">${rupiah(p.totalOriginal)}</span> ${rupiah(p.totalDiscounted)}`
        : rupiah(p.totalDiscounted);
    }
    if (sumShipping) {
      sumShipping.textContent = state.voucherApplied ? 'Rp 0 (Gratis)' : 'Rp 15.000';
    }
    if (sumTotal) sumTotal.innerHTML = `<strong>${rupiah(total)}</strong>`;

    // Sticky footer
    const footerOriginal = $('#footer-original');
    const footerDiscount = $('#footer-discount');
    if (footerOriginal) {
      footerOriginal.textContent = rupiah(p.totalOriginal);
      footerOriginal.style.textDecoration = p.discountPercent > 0 ? 'line-through' : 'none';
    }
    if (footerDiscount) footerDiscount.textContent = rupiah(total);
  }

  // ============================================================
  // LOAD CONFIG
  // ============================================================
  async function loadConfig() {
    try {
      const url = `${GS_API_URL}?action=config`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) throw new Error(json.message || 'Gagal load config');

      state.config = json.data;

      // Update product info
      const nameEl = $('#product-name');
      const descEl = $('#product-desc');
      if (nameEl) nameEl.textContent = state.config.productName || 'Spray Tidur';
      if (descEl) descEl.textContent = state.config.productDescription || '';

      // WA admin link
      const waAdmin = state.config.waAdminNumber || state.config.waNumber || '';
      const askLink = $('#ask-admin-link');
      if (askLink) {
        askLink.href = `https://wa.me/${waAdmin}?text=${encodeURIComponent('Halo min, saya mau tanya-tanya dulu soal produk ini')}`;
      }

      // Render options
      renderCourierOptions();
      renderPaytypeOptions();

      // Update harga awal
      updatePricing();

      // Tampilkan notifikasi sukses
      console.log('✅ Config loaded:', state.config);

    } catch (err) {
      console.error('❌ Gagal load config:', err);
      alert('Gagal memuat konfigurasi. Pastikan GS_API_URL benar.');
    }
  }

  // ============================================================
  // RENDER COURIER OPTIONS
  // ============================================================
  function renderCourierOptions() {
    const order = [
      { key: 'JNT', label: 'JNT', icon: 'jnt', recommended: true },
      { key: 'SiCepat', label: 'SiCepat', icon: 'sicepat', recommended: false },
      { key: 'Sap', label: 'SAP', icon: 'sap', recommended: false },
      { key: 'iDexpress', label: 'iDexpress', icon: 'idexpress', recommended: false },
    ];

    const container = $('#courier-group') || document.querySelector('.courier-list');
    if (!container) return;

    container.innerHTML = '';
    order.forEach((c) => {
      const label = document.createElement('label');
      label.className = 'courier-item' + (c.recommended ? ' recommended' : '');
      label.innerHTML = `
        <input type="radio" name="courier" value="${c.key}" ${c.key === state.selectedCourier ? 'checked' : ''} />
        ${c.recommended ? '<span class="recommended-badge">⭐ Direkomendasikan</span>' : ''}
        <img src="./assets/img/couriers/${c.icon}.png" alt="${c.label}" class="courier-icon" onerror="this.style.display='none'" />
        <span>${c.label}</span>
      `;
      const radio = label.querySelector('input[type="radio"]');
      radio.addEventListener('change', () => {
        state.selectedCourier = c.key;
      });
      container.appendChild(label);
    });
  }

  // ============================================================
  // RENDER PAYMENT OPTIONS
  // ============================================================
  function renderPaytypeOptions() {
    const options = [
      { key: 'COD', channel: null, label: 'COD', sub: 'Bayar ke kurir/outlet', icon: 'cod' },
      { key: 'QRIS', channel: 'QRIS_CUSTOM', label: 'QRIS', sub: 'Semua e-wallet', icon: 'qris' },
      { key: 'MANDIRI', channel: 'MANDIRI', label: 'Mandiri VA', sub: 'Virtual Account', icon: 'mandiri' },
      { key: 'BCA', channel: 'BCA', label: 'BCA VA', sub: 'Virtual Account', icon: 'bca' },
      { key: 'BNI', channel: 'BNI', label: 'BNI VA', sub: 'Virtual Account', icon: 'bni' },
      { key: 'BRI', channel: 'BRI', label: 'BRI VA', sub: 'Virtual Account', icon: 'bri' },
      { key: 'BSI', channel: 'BSI', label: 'BSI VA', sub: 'Virtual Account', icon: 'bsi' },
      { key: 'ALFAMART', channel: 'ALFAMART', label: 'Alfamart', sub: 'Bayar di gerai', icon: 'alfamart' },
      { key: 'INDOMARET', channel: 'INDOMARET', label: 'Indomaret', sub: 'Bayar di gerai', icon: 'indomaret' },
    ];

    const container = $('#paytype-group') || document.querySelector('.payment-list');
    if (!container) return;

    container.innerHTML = '';
    options.forEach((opt) => {
      const label = document.createElement('label');
      label.className = 'payment-item';
      label.innerHTML = `
        <input type="radio" name="payment" value="${opt.key}" ${opt.key === state.selectedPaytype ? 'checked' : ''} />
        <img src="./assets/img/payment/${opt.icon}.png" alt="${opt.label}" class="method-icon" onerror="this.style.display='none'" />
        <span>${opt.label}</span>
      `;
      const radio = label.querySelector('input[type="radio"]');
      radio.addEventListener('change', () => {
        state.selectedPaytype = opt.key;
        state.selectedChannel = opt.channel;
      });
      container.appendChild(label);
    });
  }

  // ============================================================
  // QTY CONTROL
  // ============================================================
  function initQtyControls() {
    const btnPlus = document.getElementById('btn-plus');
    const btnMinus = document.getElementById('btn-minus');

    if (btnPlus) {
      btnPlus.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.qty < MAX_QTY) {
          state.qty += 1;
          updatePricing();
        } else {
          alert('Maksimal pembelian 5 pcs');
        }
      });
    }

    if (btnMinus) {
      btnMinus.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.qty > 1) {
          state.qty -= 1;
          updatePricing();
        }
      });
    }
  }

  // ============================================================
  // VOUCHER
  // ============================================================
  function initVoucher() {
    const btn = document.getElementById('btn-voucher');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.voucherApplied = !state.voucherApplied;
      btn.classList.toggle('used', state.voucherApplied);
      btn.innerHTML = state.voucherApplied
        ? '<i class="fas fa-check-circle"></i> Voucher Digunakan'
        : '<i class="fas fa-ticket-alt"></i> Gunakan Voucher Gratis Ongkir';
      updatePricing();
    });
  }

  // ============================================================
  // SEARCH KECAMATAN (Autocomplete)
  // ============================================================
  function initSearchKecamatan() {
    const searchInput = document.getElementById('kecamatan-search');
    const resultsDiv = document.getElementById('kecamatan-results');

    if (!searchInput || !resultsDiv) return;

    let debounceTimer;

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const keyword = searchInput.value.trim();
      state.selectedArea = null;
      resultsDiv.classList.remove('active');

      if (keyword.length < 3) return;

      debounceTimer = setTimeout(async () => {
        try {
          const url = `${GS_API_URL}?action=address-search&keyword=${encodeURIComponent(keyword)}`;
          const res = await fetch(url);
          const json = await res.json();

          if (!json.success || !json.data || json.data.length === 0) {
            resultsDiv.innerHTML = '<div class="search-result-item">Tidak ditemukan, coba kata kunci lain.</div>';
            resultsDiv.classList.add('active');
            return;
          }

          resultsDiv.innerHTML = '';
          const seen = new Set();

          json.data.slice(0, 15).forEach((item) => {
            const label = item.DISTRICT_NAME || item.SUBDISTRICT_NAME || '';
            if (!label || seen.has(label)) return;
            seen.add(label);

            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
              ${label}
              <span class="result-detail">${item.CITY_NAME || ''}, ${item.PROVINCE_NAME || ''}</span>
            `;
            div.dataset.provinsi = item.PROVINCE_NAME || '';
            div.dataset.kabupaten = item.CITY_NAME || '';
            div.dataset.kecamatan = label;
            div.dataset._id = item._id || '';

            div.addEventListener('click', () => {
              document.getElementById('provinsi').value = div.dataset.provinsi;
              document.getElementById('kabupaten').value = div.dataset.kabupaten;
              document.getElementById('kecamatan').value = div.dataset.kecamatan;
              searchInput.value = div.dataset.kecamatan;
              state.selectedArea = {
                PROVINCE_NAME: div.dataset.provinsi,
                CITY_NAME: div.dataset.kabupaten,
                DISTRICT_NAME: div.dataset.kecamatan,
                _id: div.dataset._id,
              };
              resultsDiv.classList.remove('active');
            });

            resultsDiv.appendChild(div);
          });

          resultsDiv.classList.add('active');

        } catch (err) {
          console.error('Error search kecamatan:', err);
          resultsDiv.innerHTML = '<div class="search-result-item">Gagal mencari, coba lagi.</div>';
          resultsDiv.classList.add('active');
        }
      }, 400);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        resultsDiv.classList.remove('active');
      }
    });
  }

  // ============================================================
  // HANDLE CHECKOUT
  // ============================================================
  async function handleCheckout(e) {
    e.preventDefault();

    if (state.isProcessing) return;
    state.isProcessing = true;

    const btn = document.getElementById('btn-checkout') || document.getElementById('submit-btn');
    const footerBtn = document.getElementById('btn-checkout-footer');

    if (btn) { btn.disabled = true; btn.textContent = 'Memproses…'; }
    if (footerBtn) { footerBtn.disabled = true; footerBtn.textContent = 'Memproses…'; }

    try {
      // Ambil data form
      const nama = document.getElementById('full-name').value.trim();
      const noHp = document.getElementById('phone').value.trim();
      const provinsi = document.getElementById('provinsi').value;
      const kabupaten = document.getElementById('kabupaten').value;
      const kecamatan = document.getElementById('kecamatan').value;
      const alamat = document.getElementById('alamat-lengkap').value.trim();

      // Ambil payment & courier dari radio
      const paymentRadio = document.querySelector('input[name="payment"]:checked');
      const courierRadio = document.querySelector('input[name="courier"]:checked');

      if (!paymentRadio || !courierRadio) {
        alert('Pilih metode pembayaran dan kurir!');
        throw new Error('Pilih metode pembayaran dan kurir');
      }

      const paymentMethod = paymentRadio.value;
      const courierMethod = courierRadio.value;

      // Validasi
      if (!nama) { alert('Nama lengkap wajib diisi!'); throw new Error('Nama kosong'); }
      if (!noHp || noHp.length < 8) { alert('Nomor HP tidak valid!'); throw new Error('HP invalid'); }
      if (!kecamatan || !alamat) { alert('Harap isi kecamatan dan alamat lengkap!'); throw new Error('Alamat kosong'); }

      if (!state.selectedArea) {
        alert('Harap pilih kecamatan dari daftar pencarian!');
        throw new Error('Area tidak dipilih');
      }

      const qty = state.qty;
      const basePrice = state.config?.productPrice || 209000;
      const p = calcPricing(basePrice, qty);
      const shipping = state.voucherApplied ? 0 : 15000;
      const total = p.totalDiscounted + shipping;
      const isCOD = (paymentMethod === 'COD');
      const weight = (state.config?.productWeight || 0.15) * qty;

      // Buat payload
      const payload = {
        customerName: nama,
        customerPhone: noHp.replace(/\D/g, ''),
        province: state.selectedArea.PROVINCE_NAME || provinsi,
        city: state.selectedArea.CITY_NAME || kabupaten,
        district: state.selectedArea.DISTRICT_NAME || kecamatan,
        subdistrict: state.selectedArea.DISTRICT_NAME || kecamatan,
        addressDetail: alamat,
        destinationAddressId: state.selectedArea._id || '',
        qty: qty,
        courierChoice: courierMethod,
        paymentType: isCOD ? 'COD' : 'NONCOD',
        paymentChannel: isCOD ? null : state.selectedChannel,
      };

      console.log('📦 Payload:', payload);

      // Kirim ke backend
      const response = await fetch(`${GS_API_URL}?action=create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Checkout gagal');
      }

      if (isCOD) {
        // COD: langsung ke tracking
        window.location.href = `./tracking.html?order=${encodeURIComponent(result.orderId)}`;
      } else {
        // NON-COD: tampilkan halaman pembayaran
        renderPaymentScreen(result);
        showSection('payment');
        startPolling(result.orderId);
      }

    } catch (err) {
      console.error('❌ Checkout error:', err);
      const msgEl = document.getElementById('form-msg');
      if (msgEl) {
        msgEl.textContent = err.message || 'Terjadi kesalahan, coba lagi.';
        msgEl.classList.add('show');
      } else {
        alert(err.message || 'Terjadi kesalahan, coba lagi.');
      }
    } finally {
      state.isProcessing = false;
      const btn = document.getElementById('btn-checkout') || document.getElementById('submit-btn');
      const footerBtn = document.getElementById('btn-checkout-footer');
      if (btn) { btn.disabled = false; btn.textContent = 'Pesan Sekarang!'; }
      if (footerBtn) { footerBtn.disabled = false; footerBtn.textContent = 'Pesan Sekarang!'; }
    }
  }

  // ============================================================
  // SHOW SECTION
  // ============================================================
  function showSection(id) {
    const sections = ['section-landing', 'section-payment', 'section-packed', 'section-tracking'];
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('active', s === id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // RENDER PAYMENT SCREEN
  // ============================================================
  function renderPaymentScreen(result) {
    const p = result.payment || {};
    const orderId = result.orderId || '';
    const totalPrice = result.totalPrice || 0;

    document.getElementById('pay-order-id').textContent = orderId;
    document.getElementById('pay-total-val').textContent = rupiah(p.total_amount ?? totalPrice);

    document.getElementById('pay-qris').style.display = 'none';
    document.getElementById('pay-va').style.display = 'none';
    document.getElementById('pay-retail').style.display = 'none';
    document.getElementById('pay-steps').innerHTML = '';

    const extLink = document.getElementById('pay-external-link');
    if (extLink) {
      if (p.checkout_url) {
        extLink.href = p.checkout_url;
        extLink.style.display = 'inline';
      } else {
        extLink.style.display = 'none';
      }
    }

    if (p.qrUrl) {
      document.getElementById('pay-qris').style.display = 'block';
      document.getElementById('pay-qr-img').src = p.qrUrl;
      setPaymentSteps([
        'Screenshot atau scan langsung kode QR di atas',
        'Buka aplikasi dompet digital (Dana, Gopay, OVO, ShopeePay, dll)',
        'Pilih menu Scan QR, lalu scan kode QRIS di atas',
        'Pastikan nominal & data transaksi sudah sesuai',
        'Selesaikan pembayaran, halaman ini otomatis update',
      ]);
    } else if (p.va_number) {
      document.getElementById('pay-va').style.display = 'block';
      document.getElementById('pay-va-bank').textContent = p.bank_name || p.bank || 'Virtual Account';
      document.getElementById('pay-va-number').textContent = p.va_number;
      setPaymentSteps([
        'Buka aplikasi mobile banking sesuai bank di atas',
        'Pilih menu Transfer / Virtual Account',
        'Masukkan nomor Virtual Account di atas',
        'Masukkan nominal sesuai Total Bayar',
        'Konfirmasi dan selesaikan pembayaran',
      ]);
    } else if (p.payment_code) {
      document.getElementById('pay-retail').style.display = 'block';
      document.getElementById('pay-retail-name').textContent = p.retail_name || 'Retail';
      document.getElementById('pay-retail-code').textContent = p.payment_code;
      setPaymentSteps([
        `Datang ke gerai ${p.retail_name || 'retail'} terdekat`,
        'Sampaikan ke kasir ingin melakukan pembayaran',
        'Sebutkan kode pembayaran di atas',
        'Bayar sesuai nominal Total Bayar',
        'Simpan bukti pembayaran Anda',
      ]);
    } else {
      document.getElementById('pay-steps').innerHTML = `<li>${JSON.stringify(p)}</li>`;
    }
  }

  function setPaymentSteps(items) {
    const el = document.getElementById('pay-steps');
    if (el) el.innerHTML = items.map(s => `<li>${s}</li>`).join('');
  }

  // ============================================================
  // POLLING
  // ============================================================
  function startPolling(orderId) {
    if (state.pollTimer) clearInterval(state.pollTimer);

    state.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${GS_API_URL}?action=check-status&orderId=${encodeURIComponent(orderId)}`);
        const json = await res.json();

        if (!json.success) return;

        if (json.paymentStatus === 'PAID' || json.paymentStatus === 'PAID_PENDING_SYNC') {
          clearInterval(state.pollTimer);
          window.location.href = `./tracking.html?order=${encodeURIComponent(orderId)}`;
        }
      } catch (e) {
        // silent
      }
    }, 4000);
  }

  // ============================================================
  // GIMMICKS
  // ============================================================
  function startCountdown() {
    let seconds = 30 * 60; // 30 menit
    const el = document.getElementById('countdown-timer');
    if (!el) return;

    setInterval(() => {
      seconds -= 1;
      if (seconds < 0) seconds = 30 * 60;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }, 1000);
  }

  function startFakeNotif() {
    const names = [
      'Ahmad Fauzi', 'Dewi Sartika', 'Budi Santoso', 'Rina Anggraini', 'Fajar Ramadhan',
      'Nurul Hikmah', 'Agus Salim', 'Siti Aisyah', 'Andi Pratama', 'Mega Lestari',
      'Rudi Hartono', 'Lisa Permata', 'Doni Saputra', 'Winda Sari', 'Hendra Wijaya',
      'Rizky Amelia', 'Gilang Nugroho', 'Diana Putri', 'Eko Prasetyo', 'Maya Sari',
      'Irfan Hakim', 'Tiara Maharani', 'Arif Rahman', 'Laila Fitria', 'Rizki Maulana'
    ];
    const cities = ['Bandung', 'Jakarta', 'Surabaya', 'Semarang', 'Medan', 'Sukabumi', 'Bekasi', 'Depok', 'Malang', 'Makassar'];
    const times = ['baru saja', '1 menit lalu', '2 menit lalu', '3 menit lalu', '4 menit lalu', '5 menit lalu', '8 menit lalu', '10 menit lalu', '12 menit lalu', '15 menit lalu'];

    function showNotif() {
      const name = names[Math.floor(Math.random() * names.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const time = times[Math.floor(Math.random() * times.length)];
      const popup = document.getElementById('notification-popup');
      const textEl = document.getElementById('notif-text');
      if (popup && textEl) {
        textEl.textContent = `${name} dari ${city} membeli produk ini ${time}`;
        popup.style.display = 'block';
        setTimeout(() => { popup.style.display = 'none'; }, 5000);
      }
    }

    setTimeout(showNotif, 3000);
    setInterval(showNotif, 8000 + Math.random() * 5000);
  }

  function startTrustPopup() {
    const messages = ['🔥 Stok Terbatas!', '💰 Garansi Uang Kembali 100%', '⭐ Ulasan 4.9/5', '📦 Pengiriman Cepat!', '✅ 100% Produk Asli'];
    let index = 0;
    const popup = document.getElementById('trust-popup');
    const content = document.getElementById('trust-content');

    if (!popup || !content) return;

    function show() {
      content.innerHTML = `<i class="fas fa-check-circle" style="color:#25D366;"></i> ${messages[index % messages.length]}`;
      popup.style.display = 'block';
      setTimeout(() => { popup.style.display = 'none'; }, 4000);
      index++;
    }

    setTimeout(show, 2000);
    setInterval(show, 10000);
  }

  function startSoldCounter() {
    let sold = 10234;
    const el = document.getElementById('sold-counter');
    if (!el) return;

    setInterval(() => {
      sold += Math.floor(Math.random() * 5) + 1;
      el.textContent = sold.toLocaleString() + '+';
    }, 3000);
  }

  // ============================================================
  // STICKY FOOTER
  // ============================================================
  function initStickyBar() {
    const bar = document.getElementById('sticky-footer');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      bar.style.display = window.scrollY > 400 ? 'flex' : 'none';
    });
    bar.style.display = 'none';
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // Load config dulu, baru yang lain
    loadConfig().then(() => {
      initQtyControls();
      initVoucher();
      initSearchKecamatan();
      initStickyBar();

      // Tombol checkout
      const btn1 = document.getElementById('btn-checkout');
      const btn2 = document.getElementById('btn-checkout-footer');
      if (btn1) btn1.addEventListener('click', handleCheckout);
      if (btn2) btn2.addEventListener('click', handleCheckout);

      // Tombol tracking header
      const trackBtn = document.getElementById('btn-track-header');
      if (trackBtn) {
        trackBtn.addEventListener('click', () => {
          showSection('section-tracking');
          const resultDiv = document.getElementById('tracking-result');
          if (resultDiv) resultDiv.style.display = 'none';
        });
      }

      // Tombol back
      const backs = ['btn-back-home', 'btn-back-home-packed', 'btn-back-home-track'];
      backs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => showSection('section-landing'));
      });

      // Tombol tracking submit
      const trackSubmit = document.getElementById('btn-track-submit');
      if (trackSubmit) {
        trackSubmit.addEventListener('click', handleTracking);
      }

      // Gimmicks
      startCountdown();
      startFakeNotif();
      startTrustPopup();
      startSoldCounter();

      console.log('✅ App initialized!');
    });
  }

  // ============================================================
  // HANDLE TRACKING
  // ============================================================
  async function handleTracking() {
    const noHp = document.getElementById('track-phone').value.trim();
    if (!noHp) {
      alert('Masukkan No HP!');
      return;
    }

    try {
      const response = await fetch(`${GS_API_URL}?action=track-order&phone=${encodeURIComponent(noHp)}`);
      const result = await response.json();

      const resultDiv = document.getElementById('tracking-result');
      if (!resultDiv) return;

      if (result.success && result.orders && result.orders.length > 0) {
        let html = '';
        result.orders.forEach(order => {
          const status = order.shippingStatus || 'DIKEMAS';
          let step = 1;
          if (status === 'DIKIRIM') step = 2;
          else if (status === 'DITERIMA') step = 3;

          html += `
            <div class="tracking-item">
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
            </div>
          `;
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

  // ============================================================
  // START
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
