// ╔═══════════════════════════════════════════════════════════╗
// ║  Hotel Booking — script.js                                ║
// ║  + SGNIA Chatbot + Card formatting                        ║
// ╚═══════════════════════════════════════════════════════════╝

const IMG = key => `wwwroot/images/${key}.png`;
const DB_KEY      = 'hotelDB5';
const SESSION_KEY = 'hotelSession5';

// ── DB ────────────────────────────────────────────────────────
let db = {
  users: [], rooms: [], bookings: [],
  currentUser: null, pending: null,
  config: {
    whatsapp: { enabled:false, provider:'twilio', accountSid:'', authToken:'', fromNumber:'', toNumber:'' },
    gmail:    { enabled:false, provider:'emailjs', serviceId:'', templateId:'', publicKey:'', fromEmail:'', adminEmail:'' },
    general:  { hotelName:'Hotel Booking', hotelPhone:'', hotelAddress:'', currency:'USD', checkInTime:'15:00', checkOutTime:'11:00' }
  }
};
let currentPage = '';

function loadDB() {
  const s = localStorage.getItem(DB_KEY);
  if (s) {
    const stored  = JSON.parse(s);
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    db = { ...db, ...stored, currentUser: session.currentUser || stored.currentUser || null, pending: session.pending || stored.pending || null };
    if (!db.users || db.users.length === 0) {
      db.users = defaultUsers();
    }
    syncCurrentUser(); saveDB(); return;
  }
  db.users = defaultUsers();
  db.rooms = [
    { id:1, name:'Presidential Suite',    desc:'Luxury suite with panoramic view, private jacuzzi and 24-hour personal butler service.',            price:450, img:'room1', amenities:['Jacuzzi','Panoramic view','Butler','Wi-Fi 1Gbps'] },
    { id:2, name:'Deluxe Double Room',    desc:'Spacious room with two queen-size beds, private balcony, minibar and room service.',                 price:220, img:'room2', amenities:['2 Queen beds','Balcony','Minibar','Room service'] },
    { id:3, name:'Junior Studio',         desc:'Designed for the modern business traveler: executive desk, premium coffee maker and ultra-fast Wi-Fi.',price:150, img:'room3', amenities:['Desk','Coffee maker','Wi-Fi','Safe'] },
    { id:4, name:'Pool Villa',            desc:'Private villa with exclusive personal-use pool, tropical garden and fully equipped kitchen.',          price:680, img:'room4', amenities:['Private pool','Garden','Kitchen','Living room'] },
  ];
  db.bookings = [
    { id:1, roomId:1, userId:2, guest:'John Smith', email:'john@test.com', checkIn:'2026-06-01', checkOut:'2026-06-05', total:1800, nights:4, paid:true, method:'card', ref:'John Smith', notifWa:false, notifEmail:false, createdAt:new Date().toISOString() }
  ];
  saveDB();
}                          // ← llave de cierre de loadDB()
// ── DB CONFIG & DEFAULTS ──────────────────────────────────────
function defaultUsers() {
  return [
    {
      id: 1,
      name: 'Admin',
      lastName: 'System',
      age: 30,
      phone: '5550001',
      nationality: 'MX',
      email: 'admin@hotel.com',
      password: 'admin123',
      role: 'Admin',
      active: true
    },
    {
      id: 2,
      name: 'John',
      lastName: 'Smith',
      age: 28,
      phone: '5551234',
      nationality: 'MX',
      email: 'john@test.com',
      password: '123456',
      role: 'User',
      active: true
    }
  ];
}

function loadDB() {
  const s = localStorage.getItem(DB_KEY);
  if (s) {
    const stored  = JSON.parse(s);
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    db = { 
      ...db, 
      ...stored, 
      currentUser: session.currentUser || stored.currentUser || null, 
      pending: session.pending || stored.pending || null 
    };
    
    // Si por alguna razón la lista de usuarios se quedó vacía en el storage, inyectamos los defaults
    if (!db.users || db.users.length === 0) {
      db.users = defaultUsers();
      saveDB();
    }
  } else {
    // PRIMERA VEZ EN LA APP: Poblamos la base de datos con los usuarios por defecto
    db.users = defaultUsers();
    db.rooms = db.rooms || [];
    db.bookings = db.bookings || [];
    saveDB();
  }
  syncCurrentUser();
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify({
    users: db.users,
    rooms: db.rooms,
    bookings: db.bookings,
    config: db.config,
    currentUser: null,
    pending: null
  }));

  if (db.currentUser || db.pending) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      currentUser: db.currentUser,
      pending: db.pending
    }));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function syncCurrentUser() {
  if (!db.currentUser) return;
  const fresh = db.users.find(u => u.id === db.currentUser.id);
  db.currentUser = fresh || null;
}

function refreshCurrentPage() {
  updateNav();
  updateUserPageHeader();
  const r = { home:renderHome, rooms:renderRooms, 'my-bookings':renderMyBookings, booking:renderBookingPage, payment:renderPaymentPage, 'admin-panel':renderAdminPanel, 'admin-rooms':renderAdminRooms, 'admin-bookings':renderAdminBookings, 'admin-users':renderAdminUsers, 'admin-settings':renderSettings };
  if (r[currentPage]) r[currentPage]();
}

function persistAndRefresh() { saveDB(); refreshCurrentPage(); }

// ── UTILS ─────────────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelector(sel);
function fmtDate(d) { if(!d) return '—'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function calcNights(ci,co) { if(!ci||!co) return 0; return Math.max(0, Math.ceil((new Date(co)-new Date(ci))/86400000)); }
function fmtMoney(n) { return `$${Number(n).toLocaleString()}`; }
function initials(name) { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function setErr(id,msg) { const el=$(id); if(!el) return; el.textContent=msg||''; el.style.display=msg?'flex':'none'; }
function setVal(id,val) { const el=$(id); if(el) el.value=val||''; }
function getVal(id) { const el=$(id); return el?el.value.trim():''; }
function findUserByEmail(email) { return db.users.find(u=>u.email.toLowerCase()===String(email||'').toLowerCase()); }
function updateUserPageHeader() {
  const nameEl = $('page-header-user-name');
  const roleEl = $('page-header-user-role');
  if (!nameEl || !roleEl) return;
  const u = db.currentUser;
  if (u) {
    nameEl.textContent = `${u.name} ${u.lastName}`;
    roleEl.textContent = u.role === 'Admin' ? 'Administrator' : 'Guest';
  } else {
    nameEl.textContent = '';
    roleEl.textContent = '';
  }
}
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}
function roomIsOccupied(roomId, date = todayISO()) {
  return db.bookings.some(b => b.roomId === roomId && b.checkIn && b.checkOut && b.checkIn <= date && date < b.checkOut);
}
function roomStatusBadge(roomId) {
  const occupied = roomIsOccupied(roomId);
  return `<span class="room-status ${occupied ? 'room-status-occupied' : 'room-status-available'}">${occupied ? 'Ocupada' : 'Disponible'}</span>`;
}

// ── CARD FORMATTING ───────────────────────────────────────────
function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 16);
  // groups of 4
  v = v.match(/.{1,4}/g)?.join('  ') || v;
  input.value = v;
  // update preview
  const prev = $('prev-number');
  if (prev) {
    const raw = v.replace(/\s/g,'');
    const padded = raw.padEnd(16,'•');
    prev.textContent = padded.match(/.{1,4}/g).join(' ');
  }
}

function formatCardExpiry(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
  const prev = $('prev-exp');
  if (prev) prev.textContent = v || 'MM/YY';
}

function syncCardPreviewName() {
  const n = getVal('card-name');
  const prev = $('prev-name');
  if (prev) prev.textContent = n ? n.toUpperCase() : 'FULL NAME';
}

// ── NAVIGATE ──────────────────────────────────────────────────
function navigate(page) {
  syncCurrentUser();
  const adminPages = ['admin-panel','admin-rooms','admin-bookings','admin-users','admin-settings'];
  if (['login','register'].includes(page) && db.currentUser)
    page = db.currentUser.role==='Admin' ? 'admin-panel' : 'home';
  if (adminPages.includes(page) && db.currentUser?.role !== 'Admin')
    page = db.currentUser ? 'home' : 'login';
  if (['booking','payment','my-bookings'].includes(page) && !db.currentUser)
    page = 'login';

  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = $('page-'+page);
  if (el) el.classList.add('active');
  updateNav();
  window.scrollTo({ top:0, behavior:'smooth' });

  const renders = { home:renderHome, rooms:renderRooms, 'my-bookings':renderMyBookings, booking:renderBookingPage, payment:renderPaymentPage, 'admin-panel':renderAdminPanel, 'admin-rooms':renderAdminRooms, 'admin-bookings':renderAdminBookings, 'admin-users':renderAdminUsers, 'admin-settings':renderSettings };
  if (renders[page]) renders[page]();

  $('main-nav').style.display = ['login','register'].includes(page) ? 'none' : '';
}

function updateNav() {
  const u     = db.currentUser;
  const links = $('nav-links');
  const right = $('nav-right');
  if (!u) { if(links) links.innerHTML=''; if(right) right.innerHTML=''; return; }

  document.querySelectorAll('.nav-logo-img').forEach(el => el.src = 'wwwroot/images/logo.png');

  if (u.role === 'Admin') {
    links.innerHTML = `
      <button class="nav-link" onclick="navigate('admin-panel')">Dashboard</button>
      <button class="nav-link" onclick="navigate('admin-rooms')">Rooms</button>
      <button class="nav-link" onclick="navigate('admin-bookings')">Bookings</button>
      <button class="nav-link" onclick="navigate('admin-users')">Users</button>
      <button class="nav-link" onclick="navigate('admin-settings')">⚙ Settings</button>`;
  } else {
    links.innerHTML = `
      <button class="nav-link" onclick="navigate('home')">Home</button>
      <button class="nav-link" onclick="navigate('rooms')">Rooms</button>
      <button class="nav-link" onclick="navigate('my-bookings')">My Bookings</button>`;
  }

  right.innerHTML = `
    <div class="nav-divider"></div>
    <div class="nav-user-pill">
      <div class="nav-user-avatar">${initials(u.name+' '+u.lastName)}</div>
      <span class="nav-user-name">${u.name}</span>
    </div>
    <button class="btn btn-gold-outline btn-sm" onclick="doLogout()">⏻ Log out</button>`;
}

// ── AUTH ──────────────────────────────────────────────────────
function doLogin() {
  const email = getVal('login-email');
  const pass  = getVal('login-pass');
  const user  = db.users.find(u => u.email===email && u.password===pass);
  if (!user) { setErr('login-err','Incorrect email or password.'); return; }
  setErr('login-err','');
  db.currentUser = user; saveDB();
  navigate(user.role==='Admin' ? 'admin-panel' : 'home');
}

function doRegister() {
  const name  = getVal('reg-name');
  const lname = getVal('reg-lastname');
  const email = getVal('reg-email');
  const pass  = getVal('reg-pass');
  if (!name||!lname||!email||!pass) { setErr('reg-err','Complete all required fields.'); return; }
  if (db.users.find(u=>u.email===email)) { setErr('reg-err','This email is already registered.'); return; }
  const u = { id:Date.now(), name, lastName:lname, age:+getVal('reg-age'), phone:getVal('reg-phone'), nationality:getVal('reg-nationality'), email, password:pass, role:'User' };
  db.users.push(u); db.currentUser=u; saveDB();
  setErr('reg-err','');
  navigate('home');
}

function doLogout() { db.currentUser=null; db.pending=null; saveDB(); navigate('login'); }

// ── HOME ──────────────────────────────────────────────────────
function renderHome() {
  $('year').textContent = new Date().getFullYear();
  const banner = $('hero-banner');
  if (banner) banner.src = 'wwwroot/images/banner.png';

  const sr = $('hero-stat-rooms');    if(sr) sr.textContent = db.rooms.length;
  const sb = $('hero-stat-bookings'); if(sb) sb.textContent = db.bookings.length + '+';

  const heroActions = $('hero-actions');
  if (heroActions) {
    heroActions.innerHTML = db.currentUser
      ? `<button class="btn btn-gold btn-lg" onclick="navigate('rooms')">Explore rooms</button>
         <button class="btn btn-ghost btn-lg" onclick="navigate('my-bookings')">My bookings</button>`
      : `<button class="btn btn-gold btn-lg" onclick="navigate('rooms')">Explore rooms</button>
         <button class="btn btn-ghost btn-lg" onclick="navigate('register')">Create account</button>`;
  }

  const grid = $('home-rooms-grid');
  if (!grid) return;
  grid.innerHTML = db.rooms.slice(0,3).map((r,i) => `
    <div class="room-card anim-fade-up-${i+2}" style="animation-delay:${i*0.1}s">
      <div class="room-card-media">
        <img src="${IMG(r.img)}" alt="${r.name}" onerror="this.parentElement.style.background='#e8e0d0'"/>
        <div class="room-card-badge">${r.amenities?.[0]||'Room'}</div>
        <div class="room-card-status">${roomStatusBadge(r.id)}</div>
      </div>
      <div class="room-card-body">
        <div class="room-card-name">${r.name}</div>
        <div class="room-card-desc">${r.desc}</div>
        <div class="room-card-foot">
          <div class="room-price">
            <div class="room-price-amount">${fmtMoney(r.price)}</div>
            <div class="room-price-unit">per night</div>
          </div>
          <button class="btn btn-gold btn-sm" onclick="startBooking(${r.id})">Book</button>
        </div>
      </div>
    </div>`).join('');
}

// ── MY BOOKINGS ───────────────────────────────────────────────
function renderMyBookings() {
  const list = $('my-bookings-list');
  if (!list||!db.currentUser) return;
  const mine = db.bookings
    .filter(r => r.userId===db.currentUser.id || r.email===db.currentUser.email)
    .sort((a,b)=>(b.id||0)-(a.id||0));

  list.innerHTML = mine.map(r => {
    const room = db.rooms.find(rm=>rm.id===r.roomId);
    return `
      <div class="my-booking-card">
        <div>
          <div class="section-kicker">${r.paid?'Paid':'Pending'}</div>
          <h3>${room?.name||'Room unavailable'}</h3>
          <p>${fmtDate(r.checkIn)} — ${fmtDate(r.checkOut)} · ${r.nights||calcNights(r.checkIn,r.checkOut)} night(s)</p>
        </div>
        <div class="my-booking-side">
          <strong>${fmtMoney(r.total||0)}</strong>
          <span class="badge ${r.paid?'badge-yes':'badge-no'}">${r.paid?'Paid':'Pending'}</span>
        </div>
      </div>`;
  }).join('') || `
    <div class="empty-state">
      <h3>No bookings yet</h3>
      <p>When you make a booking or an admin registers one for your email, it will appear here.</p>
      <button class="btn btn-gold" onclick="navigate('rooms')">View rooms</button>
    </div>`;
}

// ── ROOMS PAGE ────────────────────────────────────────────────
function renderRooms() {
  const list = $('rooms-list');
  if (!list) return;
  list.innerHTML = db.rooms.map((r,i) => `
    <div class="room-row anim-fade-up" style="animation-delay:${i*0.08}s">
      <img class="rr-img" src="${IMG(r.img)}" alt="${r.name}" onerror="this.style.background='#e8e0d0'"/>
      <div class="rr-body">
        <div class="rr-status-line">
          <div class="rr-kicker">Immediate availability</div>
          ${roomStatusBadge(r.id)}
        </div>
        <h2 class="rr-name">${r.name}</h2>
        <p class="rr-desc">${r.desc}</p>
        <div class="rr-amenities">${(r.amenities||[]).map(a=>`<span class="amenity-tag">${a}</span>`).join('')}</div>
        <div class="rr-price">${fmtMoney(r.price)}<small>/ night</small></div>
        <button class="btn btn-gold" onclick="startBooking(${r.id})">Book now →</button>
      </div>
    </div>`).join('');
}

// ── BOOKING FLOW ──────────────────────────────────────────────
function startBooking(roomId) {
  if (!db.currentUser) { navigate('login'); return; }
  if (db.currentUser.role==='Admin') { alert('Administrators cannot make bookings.'); return; }
  const room = db.rooms.find(r=>r.id===roomId);
  if (!room) return;
  db.pending = { roomId }; saveDB();
  navigate('booking');
}

function renderBookingPage() {
  const pb = db.pending;
  if (!pb) return;
  const room = db.rooms.find(r=>r.id===pb.roomId);
  if (!room) return;
  const info = $('booking-room-summary');
  if (info) {
    info.innerHTML = `
      <img class="summary-card-img" src="${IMG(room.img)}" alt="${room.name}" onerror="this.style.background='#1a1712'"/>
      <div class="summary-card-body">
        <div class="summary-card-name">${room.name}</div>
        <div class="text-sm text-muted mt-8">${room.desc.slice(0,80)}…</div>
        <div class="summary-divider"></div>
        <div class="summary-row"><span class="s-label">Base price</span><span class="s-val">${fmtMoney(room.price)}/night</span></div>
        <div id="summary-dynamic"></div>
        <div class="summary-total-row">
          <span class="summary-total-label">Estimated total</span>
          <span class="summary-total-val" id="summary-total">—</span>
        </div>
      </div>`;
  }
  setErr('booking-err','');
  ['booking-checkin','booking-checkout'].forEach(id => { if($(id)) $(id).value=''; });
  if($('booking-guests')) $('booking-guests').value='1';
  const today = new Date().toISOString().split('T')[0];
  if($('booking-checkin'))  $('booking-checkin').min  = today;
  if($('booking-checkout')) $('booking-checkout').min = today;
}

function updateBookingSummary() {
  const ci = getVal('booking-checkin');
  const co = getVal('booking-checkout');
  const sd = $('summary-dynamic');
  const st = $('summary-total');
  if (!ci||!co||!sd||!st) return;
  const nights = Math.ceil((new Date(co)-new Date(ci))/86400000);
  if (nights<=0) return;
  const room  = db.rooms.find(r=>r.id===db.pending?.roomId);
  const total = nights*(room?.price||0);
  sd.innerHTML = `
    <div class="summary-row"><span class="s-label">Check-in</span><span class="s-val">${fmtDate(ci)}</span></div>
    <div class="summary-row"><span class="s-label">Check-out</span><span class="s-val">${fmtDate(co)}</span></div>
    <div class="summary-row"><span class="s-label">Nights</span><span class="s-val">${nights}</span></div>`;
  st.textContent = fmtMoney(total);
}

function goToPayment() {
  const ci     = getVal('booking-checkin');
  const co     = getVal('booking-checkout');
  const guests = +getVal('booking-guests');
  if (!ci||!co)                           { setErr('booking-err','Select check-in and check-out dates.'); return; }
  if (new Date(co)<=new Date(ci))         { setErr('booking-err','Check-out must be after check-in.'); return; }
  if (guests<1)                           { setErr('booking-err','Number of guests must be at least 1.'); return; }
  const room   = db.rooms.find(r=>r.id===db.pending.roomId);
  const nights = Math.ceil((new Date(co)-new Date(ci))/86400000);
  db.pending   = { ...db.pending, checkIn:ci, checkOut:co, guests, nights, total:nights*room.price };
  saveDB(); navigate('payment');
}

// ── PAYMENT ───────────────────────────────────────────────────
function renderPaymentPage() {
  const pb = db.pending;
  if (!pb||!pb.nights) return;
  const room = db.rooms.find(r=>r.id===pb.roomId);
  const sum  = $('payment-summary-card');
  if (sum) {
    sum.innerHTML = `
      <img class="summary-card-img" src="${IMG(room.img)}" alt="${room.name}" onerror="this.style.background='#1a1712'"/>
      <div class="summary-card-body">
        <div class="summary-card-name">${room.name}</div>
        <div class="summary-divider"></div>
        <div class="summary-row"><span class="s-label">Check-in</span><span class="s-val">${fmtDate(pb.checkIn)}</span></div>
        <div class="summary-row"><span class="s-label">Check-out</span><span class="s-val">${fmtDate(pb.checkOut)}</span></div>
        <div class="summary-row"><span class="s-label">Nights</span><span class="s-val">${pb.nights}</span></div>
        <div class="summary-row"><span class="s-label">Price/night</span><span class="s-val">${fmtMoney(room.price)}</span></div>
        <div class="summary-total-row">
          <span class="summary-total-label">Total</span>
          <span class="summary-total-val">${fmtMoney(pb.total)}</span>
        </div>
      </div>`;
  }
  setErr('pay-err','');
  document.querySelectorAll('.pay-section').forEach(el=>el.classList.remove('show'));
  document.querySelectorAll('.pay-tab').forEach(el=>el.classList.remove('active'));

  // card-name live preview
  const cn = $('card-name');
  if (cn) cn.addEventListener('input', syncCardPreviewName);
}

function selectPayTab(method) {
  document.querySelectorAll('.pay-tab').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.pay-section').forEach(el=>el.classList.remove('show'));
  const tab = $('tab-'+method);
  const sec = $('ps-'+method);
  if (tab) tab.classList.add('active');
  if (sec) sec.classList.add('show');
}

function confirmPayment() {
  const activeSec = $$('.pay-section.show');
  if (!activeSec) { setErr('pay-err','Select a payment method.'); return; }
  const method = activeSec.dataset.method;
  let ref = '';
  if (method==='card') {
    const n=getVal('card-name'), num=getVal('card-num');
    if (!n||!num) { setErr('pay-err','Complete the card details.'); return; }
    ref = n;
  } else if (method==='bank-transfer') {
    const b=getVal('bank-name');
    if (!b) { setErr('pay-err','Enter the bank name.'); return; }
    ref = b;
  } else if (method==='paypal') {
    const p=getVal('pp-email');
    if (!p) { setErr('pay-err','Enter your PayPal email.'); return; }
    ref = p;
  } else if (method==='cash') {
    ref = 'Pay at reception';
  }
  setErr('pay-err','');
  const u  = db.currentUser;
  const pb = db.pending;
  const room = db.rooms.find(r=>r.id===pb.roomId);
  const newR = { id:Date.now(), roomId:pb.roomId, userId:u.id, guest:u.name+' '+u.lastName, email:u.email, checkIn:pb.checkIn, checkOut:pb.checkOut, nights:pb.nights, total:pb.total, paid:true, method, ref, notifWa:false, notifEmail:false, createdAt:new Date().toISOString() };
  db.bookings.push(newR);
  db.pending=null; saveDB();
  sendNotifications(newR, room, u);
  renderConfirmPage(newR, room);
  navigate('confirm');
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
function sendNotifications(booking, room, user) {
  const cfg = db.config;
  if (cfg.whatsapp.enabled && cfg.whatsapp.accountSid && cfg.whatsapp.authToken) sendWhatsApp(booking, room, user);
  if (cfg.gmail.enabled    && cfg.gmail.serviceId    && cfg.gmail.publicKey)     sendEmail(booking, room, user);
}

function sendWhatsApp(res, room, user) {
  console.log('[WhatsApp] Sending confirmation to', db.config.whatsapp.toNumber);
  const msg = `🏨 *Booking Confirmation*\n\nHi ${user.name},\n\nYour booking is confirmed:\n• Room: ${room.name}\n• Check-in: ${fmtDate(res.checkIn)}\n• Check-out: ${fmtDate(res.checkOut)}\n• Nights: ${res.nights}\n• Total: ${fmtMoney(res.total)}\n\nWe look forward to welcoming you!\n— ${db.config.general.hotelName}`;
  console.log('[WhatsApp Message]', msg);
  const r = db.bookings.find(r=>r.id===res.id);
  if (r) { r.notifWa=true; saveDB(); }
}

function sendEmail(res, room, user) {
  const cfg = db.config.gmail;
  if (typeof emailjs==='undefined') { console.warn('[Email] EmailJS not loaded.'); return; }
  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId, cfg.templateId, {
    to_name: user.name+' '+user.lastName, to_email: user.email,
    room_name: room.name, check_in: fmtDate(res.checkIn), check_out: fmtDate(res.checkOut),
    nights: res.nights, total: fmtMoney(res.total),
    hotel_name: db.config.general.hotelName, hotel_phone: db.config.general.hotelPhone||'',
  })
  .then(() => { const r=db.bookings.find(r=>r.id===res.id); if(r){r.notifEmail=true;saveDB();} })
  .catch(err => console.error('[Email] Error:', err));
}

// ── CONFIRM PAGE ──────────────────────────────────────────────
function renderConfirmPage(res, room) {
  const cfg = db.config;
  const badges = [];
  if (cfg.whatsapp.enabled && cfg.whatsapp.accountSid) badges.push('<div class="confirm-notif-badge">📱 WhatsApp sent</div>');
  if (cfg.gmail.enabled    && cfg.gmail.publicKey)     badges.push('<div class="confirm-notif-badge">📧 Email sent</div>');
  if (!badges.length) badges.push('<div class="confirm-notif-badge">📋 Booking registered</div>');
  const nb = $('confirm-notif-row');
  if (nb) nb.innerHTML = badges.join('');

  const mLabel = { card:'Credit/Debit Card', 'bank-transfer':'Bank Transfer', paypal:'PayPal', cash:'Cash at reception' };
  const det = $('confirm-details');
  if (det) {
    det.innerHTML = `
      <div class="detail-card-header">Booking Details</div>
      <div class="detail-row"><span class="detail-label">Room</span><span class="detail-val">${room.name}</span></div>
      <div class="detail-row"><span class="detail-label">Check-in</span><span class="detail-val">${fmtDate(res.checkIn)}</span></div>
      <div class="detail-row"><span class="detail-label">Check-out</span><span class="detail-val">${fmtDate(res.checkOut)}</span></div>
      <div class="detail-row"><span class="detail-label">Nights</span><span class="detail-val">${res.nights}</span></div>
      <div class="detail-row"><span class="detail-label">Payment method</span><span class="detail-val">${mLabel[res.method]||res.method}</span></div>
      <div class="detail-row"><span class="detail-label">Total paid</span><span class="detail-val detail-val-gold">${fmtMoney(res.total)}</span></div>`;
  }
}

// ── ADMIN PANEL ───────────────────────────────────────────────
function renderAdminPanel() {
  const totalRev = db.bookings.filter(r=>r.paid).reduce((a,r)=>a+r.total,0);
  const setEl = (id,v) => { const el=$(id); if(el) el.textContent=v; };
  setEl('ap-rooms',    db.rooms.length);
  setEl('ap-bookings', db.bookings.length);
  setEl('ap-users',    db.users.length);
  setEl('ap-revenue',  fmtMoney(totalRev));
  const tbody = $('ap-recent-tbody');
  if (!tbody) return;
  const recent = [...db.bookings].sort((a,b)=>b.id-a.id).slice(0,5);
  tbody.innerHTML = recent.map(r => {
    const room = db.rooms.find(rm=>rm.id===r.roomId);
    return `<tr>
      <td><strong>${r.guest}</strong></td>
      <td>${room?.name||'—'}</td>
      <td>${fmtDate(r.checkIn)}</td>
      <td>${fmtDate(r.checkOut)}</td>
      <td>${fmtMoney(r.total)}</td>
      <td><span class="badge ${r.paid?'badge-yes':'badge-no'}">${r.paid?'Paid':'Pending'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--stone-400)">No bookings.</td></tr>';
}

// ── ADMIN ROOMS ───────────────────────────────────────────────
function renderAdminRooms() {
  const tbody = $('admin-rooms-tbody');
  if (!tbody) return;
  tbody.innerHTML = db.rooms.map(r => `
    <tr>
      <td><img class="thumb" src="${IMG(r.img)}" alt="${r.name}" onerror="this.style.background='#e8e0d0'"/></td>
      <td><strong>${r.name}</strong></td>
      // Línea 965 protegida en tu script.js:
<td style="max-width:200px;color:var(--stone-500);font-size:.82rem;">${(r.desc || '').slice(0,70)}…</td>
      <td>${fmtMoney(r.price)}</td>
      <td>${roomStatusBadge(r.id)}</td>
      <td>${(r.amenities||[]).slice(0,2).map(a=>`<span class="badge badge-user">${a}</span>`).join(' ')}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-gold btn-sm" onclick="editRoom(${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal('room',${r.id})">Delete</button>
      </td>
    </tr>`).join('');
}

function openRoomModal(id) {
  $('rm-title').textContent = id ? 'Edit Room' : 'New Room';
  $('rm-id').value = id||'';
  if (id) {
    const r = db.rooms.find(r=>r.id===id);
    setVal('rm-name', r.name); setVal('rm-desc', r.desc);
    setVal('rm-price', r.price); setVal('rm-img', r.img);
    setVal('rm-amenities', (r.amenities||[]).join(', '));
  } else {
    ['rm-name','rm-desc','rm-price','rm-amenities'].forEach(x=>setVal(x,''));
    setVal('rm-img','room1');
  }
  $('modal-room').classList.add('open');
}
function editRoom(id) { openRoomModal(id); }

function saveRoom() {
  const id   = getVal('rm-id');
  const name = getVal('rm-name');
  const desc = getVal('rm-desc');
  const price = +getVal('rm-price');
  const img  = getVal('rm-img')||'room1';
  const amenities = getVal('rm-amenities').split(',').map(s=>s.trim()).filter(Boolean);
  if (!name||!price) { alert('Name and price are required.'); return; }
  if (id) { Object.assign(db.rooms.find(r=>r.id===+id), {name,desc,price,img,amenities}); }
  else    { db.rooms.push({id:Date.now(),name,desc,price,img,amenities}); }
  persistAndRefresh(); closeModal('modal-room'); renderAdminRooms();
}

// ── ADMIN BOOKINGS ────────────────────────────────────────────
function renderAdminBookings() {
  const tbody = $('admin-bookings-tbody');
  if (!tbody) return;
  if (!db.bookings.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:36px;color:var(--stone-400)">No bookings.</td></tr>';
    return;
  }
  tbody.innerHTML = db.bookings.map(r => {
    const room = db.rooms.find(rm=>rm.id===r.roomId);
    const waIcon  = r.notifWa    ? '📱✓' : (db.config.whatsapp.enabled ? '📱?' : '—');
    const emlIcon = r.notifEmail ? '📧✓' : (db.config.gmail.enabled    ? '📧?' : '—');
    return `<tr>
      <td><strong>${r.guest}</strong><br><span style="font-size:.76rem;color:var(--stone-500)">${r.email}</span></td>
      <td>${room?.name||'—'}</td>
      <td>${fmtDate(r.checkIn)}</td>
      <td>${fmtDate(r.checkOut)}</td>
      <td>${r.nights||'—'}</td>
      <td><strong>${fmtMoney(r.total)}</strong></td>
      <td><span class="badge ${r.paid?'badge-yes':'badge-no'}">${r.paid?'Paid':'Pending'}</span></td>
      <td style="font-size:.78rem;color:var(--stone-500)">${waIcon} ${emlIcon}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-gold btn-sm" onclick="editBooking(${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal('booking',${r.id})">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function openBookingModal(id) {
  const sel = $('booking-room-select');
  sel.innerHTML = db.rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  $('booking-modal-title').textContent = id ? 'Edit Booking' : 'New Booking';
  $('booking-modal-id').value = id||'';
  if (id) {
    const r = db.bookings.find(r=>r.id===id);
    setVal('booking-guest-input',    r.guest);
    setVal('booking-email-input',    r.email);
    sel.value = r.roomId;
    setVal('booking-checkin-input',  r.checkIn);
    setVal('booking-checkout-input', r.checkOut);
    setVal('booking-total-input',    r.total);
    $('booking-paid-check').checked = r.paid;
  } else {
    ['booking-guest-input','booking-email-input','booking-checkin-input','booking-checkout-input','booking-total-input'].forEach(x=>setVal(x,''));
    $('booking-paid-check').checked = false;
  }
  $('modal-booking').classList.add('open');
}
function editBooking(id) { openBookingModal(id); }

function saveBooking() {
  const id      = getVal('booking-modal-id');
  const checkIn = getVal('booking-checkin-input');
  const checkOut= getVal('booking-checkout-input');
  const user    = findUserByEmail(getVal('booking-email-input'));
  const data = {
    guest:   getVal('booking-guest-input'),
    email:   getVal('booking-email-input'),
    roomId:  +$('booking-room-select').value,
    userId:  user?.id||0, checkIn, checkOut,
    nights:  calcNights(checkIn, checkOut),
    total:   +getVal('booking-total-input'),
    paid:    $('booking-paid-check').checked,
  };
  if (!data.guest||!data.checkIn||!data.checkOut) { alert('Complete the required fields.'); return; }
  if (data.nights<=0) { alert('Check-out must be after check-in.'); return; }
  if (!data.total) { const room=db.rooms.find(r=>r.id===data.roomId); data.total=data.nights*(room?.price||0); }
  if (id) { Object.assign(db.bookings.find(r=>r.id===+id), data); }
  else    { db.bookings.push({id:Date.now(),method:'manual',ref:'Admin',notifWa:false,notifEmail:false,createdAt:new Date().toISOString(),...data}); }
  persistAndRefresh(); closeModal('modal-booking'); renderAdminBookings();
}

// ── ADMIN USERS ───────────────────────────────────────────────
function renderAdminUsers() {
    const tableBody = document.getElementById('adminUsersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const loggedInUser = db.currentUser; // Sincronizado con tu sistema de sesión nativo

    const usersToRender = db.users || [];

    usersToRender.forEach(user => {
        const tr = document.createElement('tr');
        const isSelf = loggedInUser && user.email === loggedInUser.email;

        tr.innerHTML = `
            <td>${user.id}</td>
            <td>
                ${user.name}
                ${isSelf ? '<span style="color:#007bff;font-weight:bold;">(Tú)</span>' : ''}
            </td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
                <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                    ${user.active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button class="btn-action btn-edit" onclick="openEditUserModal(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-toggle" onclick="toggleUserStatus(${user.id})"
                    ${isSelf ? 'disabled style="opacity:0.5;cursor:not-allowed;" title="No puedes inactivar tu propia cuenta"' : ''}>
                    <i class="fas ${user.active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteUser(${user.id})"
                    ${isSelf ? 'disabled style="opacity:0.5;cursor:not-allowed;" title="No puedes eliminar tu propia cuenta"' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Buscar usuarios en el panel de admin
const adminSearchInput = document.getElementById('adminSearchInput');
if (adminSearchInput) {
    adminSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const loggedInUser = db.currentUser; // Sincronizado con tu sistema de sesión nativo

        const filteredUsers = db.users.filter(user =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );

        const tableBody = document.getElementById('adminUsersTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';

            filteredUsers.forEach(user => {
                const tr = document.createElement('tr');
                const isSelf = loggedInUser && user.email === loggedInUser.email;

                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name} ${isSelf ? '<span style="color: #007bff; font-weight: bold;">(Tú)</span>' : ''}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>
                        <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                            ${user.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-action btn-edit" onclick="openEditUserModal(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-toggle" onclick="toggleUserStatus(${user.id})" ${isSelf ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="No puedes inactivar tu propia cuenta"' : ''}>
                            <i class="fas ${user.active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteUser(${user.id})" ${isSelf ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="No puedes eliminar tu propia cuenta"' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    });
}

// ── SETTINGS ──────────────────────────────────────────────────
function renderSettings() { loadSettingsValues(); openSettingsTab('general'); }

function loadSettingsValues() {
  const cfg = db.config;
  setVal('cfg-hotel-name',    cfg.general.hotelName);
  setVal('cfg-hotel-phone',   cfg.general.hotelPhone);
  setVal('cfg-hotel-address', cfg.general.hotelAddress);
  setVal('cfg-currency',      cfg.general.currency);
  setVal('cfg-checkin-time',  cfg.general.checkInTime);
  setVal('cfg-checkout-time', cfg.general.checkOutTime);
  const wa = cfg.whatsapp;
  setVal('wa-account-sid', wa.accountSid); setVal('wa-auth-token', wa.authToken);
  setVal('wa-from-number', wa.fromNumber); setVal('wa-to-number',  wa.toNumber);
  const waT = $('wa-enabled'); if(waT) waT.checked = wa.enabled;
  updateWaStatus();
  const gm = cfg.gmail;
  setVal('gm-service-id',  gm.serviceId); setVal('gm-template-id', gm.templateId);
  setVal('gm-public-key',  gm.publicKey); setVal('gm-from-email',  gm.fromEmail);
  setVal('gm-admin-email', gm.adminEmail);
  const gmT = $('gm-enabled'); if(gmT) gmT.checked = gm.enabled;
  updateGmStatus();
}

function openSettingsTab(tab) {
  document.querySelectorAll('.settings-nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(el=>el.classList.remove('active'));
  const ni = $(`settings-nav-${tab}`); if(ni) ni.classList.add('active');
  const p  = $(`settings-panel-${tab}`); if(p) p.classList.add('active');
}

function saveGeneralSettings() {
  db.config.general = { hotelName:getVal('cfg-hotel-name')||'Hotel Booking', hotelPhone:getVal('cfg-hotel-phone'), hotelAddress:getVal('cfg-hotel-address'), currency:getVal('cfg-currency')||'USD', checkInTime:getVal('cfg-checkin-time')||'15:00', checkOutTime:getVal('cfg-checkout-time')||'11:00' };
  saveDB(); showSettingsSaved('settings-general-saved');
}

function saveWhatsAppSettings() {
  db.config.whatsapp = { enabled:$('wa-enabled')?.checked||false, provider:'twilio', accountSid:getVal('wa-account-sid'), authToken:getVal('wa-auth-token'), fromNumber:getVal('wa-from-number'), toNumber:getVal('wa-to-number') };
  saveDB(); updateWaStatus(); showSettingsSaved('settings-wa-saved');
}

function saveGmailSettings() {
  db.config.gmail = { enabled:$('gm-enabled')?.checked||false, provider:'emailjs', serviceId:getVal('gm-service-id'), templateId:getVal('gm-template-id'), publicKey:getVal('gm-public-key'), fromEmail:getVal('gm-from-email'), adminEmail:getVal('gm-admin-email') };
  saveDB(); updateGmStatus(); showSettingsSaved('settings-gm-saved');
}

function updateWaStatus() {
  const wa = db.config.whatsapp; const el = $('wa-status-badge'); if(!el) return;
  if (wa.enabled&&wa.accountSid&&wa.authToken) { el.className='settings-badge-status status-configured'; el.textContent='✓ Configured'; }
  else if (wa.accountSid)                      { el.className='settings-badge-status status-pending';    el.textContent='⏸ Disabled'; }
  else                                          { el.className='settings-badge-status status-unconfigured'; el.textContent='✗ Not configured'; }
}

function updateGmStatus() {
  const gm = db.config.gmail; const el = $('gm-status-badge'); if(!el) return;
  if (gm.enabled&&gm.serviceId&&gm.publicKey) { el.className='settings-badge-status status-configured'; el.textContent='✓ Configured'; }
  else if (gm.serviceId)                       { el.className='settings-badge-status status-pending';    el.textContent='⏸ Disabled'; }
  else                                          { el.className='settings-badge-status status-unconfigured'; el.textContent='✗ Not configured'; }
}

function showSettingsSaved(id) {
  const el = $(id); if(!el) return;
  el.style.display = 'flex';
  setTimeout(()=>{ el.style.display='none'; }, 3000);
}

function testWhatsApp() {
  const wa = db.config.whatsapp; const res = $('wa-test-result');
  if (!wa.accountSid||!wa.authToken||!wa.toNumber) { if(res){res.textContent='✗ Complete the credentials first.';res.className='test-result err';} return; }
  if (res) { res.textContent='✓ Settings saved. Live test available through the backend.'; res.className='test-result ok'; }
}

function testGmail() {
  const gm = db.config.gmail; const res = $('gm-test-result');
  if (!gm.serviceId||!gm.publicKey||!gm.templateId) { if(res){res.textContent='✗ Complete the EmailJS credentials first.';res.className='test-result err';} return; }
  if (typeof emailjs!=='undefined') {
    emailjs.init(gm.publicKey);
    emailjs.send(gm.serviceId, gm.templateId, {to_name:'Test',to_email:gm.adminEmail||gm.fromEmail,hotel_name:db.config.general.hotelName,room_name:'—',check_in:'—',check_out:'—',nights:'—',total:'—',hotel_phone:'—'})
      .then(()=>{if(res){res.textContent='✓ Test email sent.';res.className='test-result ok';}})
      .catch(e=>{if(res){res.textContent='✗ Error: '+e.text;res.className='test-result err';}});
  } else { if(res){res.textContent='⚠ Load the EmailJS CDN in the HTML first.';res.className='test-result err';} }
}

function toggleApiVisibility(inputId, btnId) {
  const inp=$(inputId), btn=$(btnId); if(!inp||!btn) return;
  inp.type = inp.type==='password' ? 'text' : 'password';
  btn.textContent = '👁';
}

// ── DELETE MODAL ──────────────────────────────────────────────
let _deleteFn = null;
function openDeleteModal(type, id) {
  const msgs = { room:'Delete this room? Associated bookings will also be deleted.', booking:'Delete this booking?', user:'Delete this user?' };
  $('del-msg').textContent = msgs[type]||'Confirm deletion?';
  _deleteFn = () => {
    if (type==='room')    { db.rooms=db.rooms.filter(r=>r.id!==id); db.bookings=db.bookings.filter(r=>r.roomId!==id); persistAndRefresh(); closeModal('modal-del'); renderAdminRooms(); }
    if (type==='booking') { db.bookings=db.bookings.filter(r=>r.id!==id); persistAndRefresh(); closeModal('modal-del'); renderAdminBookings(); }
    if (type==='user')    { db.users=db.users.filter(u=>u.id!==id); db.bookings=db.bookings.filter(r=>r.userId!==id); persistAndRefresh(); closeModal('modal-del'); renderAdminUsers(); }
  };
  $('modal-del').classList.add('open');
}
function execDelete() { if(_deleteFn) _deleteFn(); }
function closeModal(id) { $(id)?.classList.remove('open'); }

// ══════════════════════════════════════════════════════════════
//  SGNIA CHATBOT
// ══════════════════════════════════════════════════════════════
let sgniaOpen   = false;
let sgniaInited = false;

const SGNIA_KB = {
  greet: ['hello','hi','hey','good morning','good afternoon','good evening','hola','buenos dias','buenas','saludos'],
  rooms: ['room','rooms','suite','villa','studio','habitacion','cuarto','available','availability'],
  price: ['price','prices','cost','how much','rate','rates','tarifa','precio'],
  book:  ['book','reserve','reservation','booking','reservar','reserva'],
  checkin: ['check-in','check in','checkin','arrival','llegada','entrada'],
  checkout: ['check-out','check out','checkout','departure','salida'],
  cancel: ['cancel','cancellation','cancelar','cancelacion'],
  wifi:  ['wifi','wi-fi','internet','connection'],
  pool:  ['pool','swim','alberca','piscina','nadar'],
  food:  ['food','breakfast','restaurant','eat','meal','desayuno','comida'],
  help:  ['help','assist','support','ayuda','soporte'],
  thanks: ['thanks','thank you','gracias','thx'],
  bye:   ['bye','goodbye','see you','adios','hasta luego','chao'],
  hours: ['hours','schedule','time','horario','hora'],
  location: ['location','address','where','donde','direccion'],
  parking: ['parking','park','estacionamiento'],
  pets:  ['pet','pets','dog','cat','mascota'],
  payment: ['payment','pay','cash','card','paypal','pago','tarjeta'],
};

function sgniaDetermineIntent(text) {
  const lower = text.toLowerCase();
  for (const [intent, words] of Object.entries(SGNIA_KB)) {
    if (words.some(w => lower.includes(w))) return intent;
  }
  return 'unknown';
}

function sgniaGetResponse(intent) {
  const hotel = db.config.general.hotelName || 'Hotel Booking';
  const rooms = db.rooms;

  const responses = {
    greet: `Hello! Welcome to **${hotel}**. I'm SGNIA, your virtual assistant. How can I help you today? 😊`,
    rooms: rooms.length
      ? `We have **${rooms.length} rooms** available:\n\n${rooms.map(r=>`• **${r.name}** — ${r.amenities?.slice(0,2).join(', ')||''} · $${r.price}/night`).join('\n')}\n\nWould you like to book one?`
      : `We currently have several rooms available. Visit our **Rooms** section for details.`,
    price: rooms.length
      ? `Our room rates:\n\n${rooms.map(r=>`• **${r.name}**: $${r.price}/night`).join('\n')}\n\nAll rates include continental breakfast. 🍳`
      : `Please visit our Rooms page to see current rates.`,
    book: `To make a booking:\n\n1. Go to **Rooms** and select your room\n2. Choose check-in and check-out dates\n3. Select your payment method\n4. Done! You'll receive a confirmation. ✅`,
    checkin: `Check-in time is at **${db.config.general.checkInTime || '15:00'}**. Early check-in is subject to availability — contact reception in advance. 🏨`,
    checkout: `Check-out time is at **${db.config.general.checkOutTime || '11:00'}**. Late check-out may be available upon request. ⏰`,
    cancel: `For cancellations, please contact our reception directly. Policies vary by booking type. We recommend checking the details of your booking.`,
    wifi: `Yes! All our rooms include **complimentary high-speed Wi-Fi**. The Presidential Suite has a dedicated 1Gbps fiber connection. 📶`,
    pool: `Our **Pool Villa** includes an exclusive private pool for personal use. 🏊 Other rooms have access to the shared pool area.`,
    food: `All bookings include **continental breakfast**. We also offer room service and our on-site restaurant is open from 07:00 to 22:00. 🍽️`,
    help: `Of course! I can help you with:\n\n• 🛏️ Room information\n• 💰 Prices and availability\n• 📅 Booking process\n• ⏰ Check-in / Check-out times\n• 🅿️ Parking & services\n\nWhat would you like to know?`,
    thanks: `You're welcome! It's a pleasure assisting you. Is there anything else I can help you with? 😊`,
    bye: `Goodbye! We hope to welcome you soon at **${hotel}**. Have a wonderful day! 👋`,
    hours: `The hotel is open **24/7**. Reception is available around the clock. Restaurant hours: 07:00–22:00. 🕐`,
    location: db.config.general.hotelAddress
      ? `We are located at: **${db.config.general.hotelAddress}**. Feel free to contact us at ${db.config.general.hotelPhone||'our reception'} for directions.`
      : `Please contact us directly for our location details. Our team will be happy to assist.`,
    parking: `Yes, we offer **complimentary parking** for hotel guests. Valet parking is also available upon request. 🚗`,
    pets: `We have a limited **pet-friendly policy**. Please contact reception in advance to confirm availability and any applicable fees. 🐾`,
    payment: `We accept **Credit/Debit cards**, **Bank transfers**, **PayPal** and **cash** at reception. All online payments are secured with SSL encryption. 🔒`,
    unknown: `I'm not sure I understood that. Could you rephrase your question? You can ask me about:\n\n• Rooms & prices\n• Bookings\n• Hotel services\n• Check-in/out times`,
  };

  return responses[intent] || responses.unknown;
}

function sgniaRenderMessage(text, isBot) {
  const container = $('sgnia-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `sgnia-msg ${isBot ? 'sgnia-msg-bot' : 'sgnia-msg-user'}`;
  const formatted = text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>');
  div.innerHTML = formatted;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sgniaShowTyping() {
  const container = $('sgnia-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'sgnia-msg sgnia-msg-bot';
  div.id = 'sgnia-typing-indicator';
  div.innerHTML = '<div class="sgnia-typing"><div class="sgnia-dot"></div><div class="sgnia-dot"></div><div class="sgnia-dot"></div></div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sgniaRemoveTyping() {
  const t = $('sgnia-typing-indicator');
  if (t) t.remove();
}

function sgniaSetQuickReplies(replies) {
  const qr = $('sgnia-quick-replies');
  if (!qr) return;
  qr.innerHTML = replies.map(r => `<button class="sgnia-qr" onclick="sgniaSendQuick('${r}')">${r}</button>`).join('');
}

function sgniaSendQuick(text) {
  $('sgnia-quick-replies').innerHTML = '';
  sgniaRenderMessage(text, false);
  sgniaRespondTo(text);
}

function sendSgniaMessage() {
  const input = $('sgnia-input');
  if (!input) return;
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  $('sgnia-quick-replies').innerHTML = '';
  sgniaRenderMessage(text, false);
  sgniaRespondTo(text);
}

function sgniaRespondTo(text) {
  sgniaShowTyping();
  setTimeout(() => {
    sgniaRemoveTyping();
    const intent   = sgniaDetermineIntent(text);
    const response = sgniaGetResponse(intent);
    sgniaRenderMessage(response, true);

    const qrMap = {
      greet:   ['View rooms', 'Prices', 'How to book', 'Services'],
      rooms:   ['How to book', 'Check-in time', 'Prices'],
      price:   ['Book a room', 'View rooms', 'Payment methods'],
      book:    ['View rooms', 'Check-in time', 'Payment methods'],
      help:    ['Rooms', 'Prices', 'Check-in', 'Services'],
      unknown: ['View rooms', 'Prices', 'How to book', 'Help'],
    };
    if (qrMap[intent]) sgniaSetQuickReplies(qrMap[intent]);
  }, 800 + Math.random() * 400);
}

function sgniaInit() {
  if (sgniaInited) return;
  sgniaInited = true;
  const container = $('sgnia-messages');
  if (!container) return;
  container.innerHTML = '';
  setTimeout(() => {
    sgniaRenderMessage(`Hello! I'm **SGNIA**, your virtual assistant at **${db.config.general.hotelName || 'Hotel Booking'}**. How can I help you today?`, true);
    sgniaSetQuickReplies(['View rooms', 'Prices', 'How to book', 'Services', 'Check-in/out']);
  }, 400);
}

function toggleChat() {
  const win = $('sgnia-window');
  if (!win) return;
  sgniaOpen = !sgniaOpen;
  win.classList.toggle('hidden', !sgniaOpen);
  if (sgniaOpen) { sgniaInit(); setTimeout(()=>{ const inp=$('sgnia-input'); if(inp) inp.focus(); }, 100); }
}

// Exponer al scope global para los event-handlers del HTML
window.toggleChat       = toggleChat;
window.sendSgniaMessage = sendSgniaMessage;
window.sgniaSendQuick   = sgniaSendQuick;

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if(e.target===el) el.classList.remove('open'); });
  });
  ['auth-logo-login','auth-logo-register'].forEach(id => {
    const el=$(id); if(el) el.src='wwwroot/images/logo.png';
  });
  loadDB();
  navigate(db.currentUser ? (db.currentUser.role==='Admin' ? 'admin-panel' : 'home') : 'login');
});

window.addEventListener('storage', (event) => {
  if (event.key!==DB_KEY||!event.newValue) return;
  const session = JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}');
  db = { ...db, ...JSON.parse(event.newValue), currentUser:session.currentUser||db.currentUser, pending:session.pending||db.pending };
  syncCurrentUser();
  if (!db.currentUser&&!['login','register'].includes(currentPage)) { navigate('login'); return; }
  refreshCurrentPage();
});