// ─── ROUTER ───
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const link = document.querySelector(`[data-page="${id}"]`);
  if (link) link.classList.add('active');

  // Lazy load page data
  const loaders = { home: loadHome, services: loadServices, dashboard: loadDashboard, admin: loadAdmin };
  if (loaders[id]) loaders[id]();
}

// ─── NAVBAR ───
function renderNav() {
  const user = auth.getUser();
  const navRight = document.getElementById('nav-right');
  const navLinks = document.getElementById('nav-links');

  navLinks.innerHTML = `
    <button class="nav-link" data-page="home" onclick="showPage('home')">Home</button>
    <button class="nav-link" data-page="services" onclick="showPage('services')">Browse Services</button>
    ${user ? `<button class="nav-link" data-page="dashboard" onclick="showPage('dashboard')">Dashboard</button>` : ''}
    ${auth.isAdmin() ? `<button class="nav-link" data-page="admin" onclick="showPage('admin')">Admin</button>` : ''}
  `;

  if (user) {
    navRight.innerHTML = `
      <span style="color:var(--text2);font-size:0.875rem">${user.full_name}</span>
      <button class="btn btn-secondary btn-sm" onclick="doLogout()">Logout</button>
    `;
  } else {
    navRight.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openModal('modal-login')">Login</button>
      <button class="btn btn-primary btn-sm" onclick="openModal('modal-register')">Register</button>
    `;
  }
}

function doLogout() {
  auth.logout();
  renderNav();
  showPage('home');
  toast('Logged out');
}

// ─── MODALS ───
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ─── AUTH FORMS ───
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('[name=email]').value;
  const password = form.querySelector('[name=password]').value;
  const errEl = form.querySelector('.form-error');
  try {
    const res = await api.post('/auth/login', { email, password });
    auth.login(res.token, res.user);
    closeModal('modal-login');
    renderNav();
    toast('Welcome back, ' + res.user.full_name + '!');
    showPage('home');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  form.querySelectorAll('[name]').forEach(el => data[el.name] = el.value || undefined);
  const errEl = form.querySelector('.form-error');
  try {
    await api.post('/auth/register', data);
    closeModal('modal-register');
    toast('Registered! Please login.');
    openModal('modal-login');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function toggleProviderFields() {
  const type = document.querySelector('#register-form [name=user_type]').value;
  document.getElementById('provider-fields').style.display = (type === 'provider' || type === 'both') ? '' : 'none';
  document.getElementById('customer-fields').style.display = (type === 'customer' || type === 'both') ? '' : 'none';
}

// ─── HOME PAGE ───
async function loadHome() {
  try {
    const [services, categories] = await Promise.all([api.get('/services?'), api.get('/categories')]);
    // Featured services
    const feat = document.getElementById('featured-services');
    feat.innerHTML = services.slice(0, 6).map(s => serviceCard(s)).join('');
    // Category pills
    const catContainer = document.getElementById('home-categories');
    catContainer.innerHTML = categories.map(c =>
      `<button class="filter-btn" onclick="showPage('services'); setTimeout(()=>filterByCategory(${c.category_id}), 100)">${c.category_name}</button>`
    ).join('');
  } catch (err) {
    console.error(err);
  }
}

// ─── SERVICES PAGE ───
let allServices = [];
let activeCategory = null;

async function loadServices() {
  try {
    const [services, categories] = await Promise.all([api.get('/services'), api.get('/categories')]);
    allServices = services;

    // Populate category filters
    const cf = document.getElementById('category-filters');
    cf.innerHTML = `<button class="filter-btn active" onclick="filterByCategory(null)">All</button>` +
      categories.map(c => `<button class="filter-btn" data-cat="${c.category_id}" onclick="filterByCategory(${c.category_id})">${c.category_name}</button>`).join('');

    renderServicesList(services);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderServicesList(services) {
  const grid = document.getElementById('services-grid');
  if (!services.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No services found</h3><p>Try different filters</p></div>`;
    return;
  }
  grid.innerHTML = services.map(s => serviceCard(s)).join('');
}

function filterByCategory(catId) {
  activeCategory = catId;
  document.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
  if (catId) {
    document.querySelector(`.filter-btn[data-cat="${catId}"]`)?.classList.add('active');
    renderServicesList(allServices.filter(s => s.category_id == catId));
  } else {
    document.querySelector('.filter-btn:first-child')?.classList.add('active');
    renderServicesList(allServices);
  }
}

function searchServices() {
  const q = document.getElementById('service-search').value.toLowerCase();
  const filtered = allServices.filter(s =>
    (!activeCategory || s.category_id == activeCategory) &&
    (s.title.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q))
  );
  renderServicesList(filtered);
}

function serviceCard(s) {
  const price = s.min_estimated_price
    ? `PKR ${s.min_estimated_price}–${s.max_estimated_price || '?'} <span>/${s.price_unit}</span>`
    : `<span>Price on request</span>`;
  return `
  <div class="service-card" onclick="openServiceDetail(${s.service_id})">
    <div class="service-card-header">
      <div class="service-title">${s.title}</div>
      <span class="service-category">${s.category_name}</span>
    </div>
    <div class="service-provider">
      <span>👤</span>
      <span>${s.business_name || s.full_name}</span>
      <span class="badge badge-${s.verification_status}">${s.verification_status}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="service-price">${price}</div>
      <div class="stars" title="${s.avg_rating} stars">${renderStars(s.avg_rating)} <span style="color:var(--text3);font-size:0.75rem">(${s.review_count})</span></div>
    </div>
    ${s.description ? `<div style="font-size:0.83rem;color:var(--text2);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${s.description}</div>` : ''}
  </div>`;
}

// ─── SERVICE DETAIL MODAL ───
async function openServiceDetail(id) {
  try {
    const s = await api.get(`/services/${id}`);
    const modal = document.getElementById('modal-service-detail');
    document.getElementById('service-detail-content').innerHTML = `
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem">
        <span class="service-category">${s.category_name}</span>
        <span class="badge badge-${s.verification_status}">${s.verification_status}</span>
        <span class="badge" style="background:var(--bg3);color:var(--text2)">${s.booking_type.replace('_',' ')}</span>
      </div>
      <h2 style="font-family:Fraunces,serif;font-size:1.5rem;margin-bottom:0.5rem">${s.title}</h2>
      <div style="color:var(--text2);font-size:0.9rem;margin-bottom:1rem">${s.description || 'No description provided.'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
        <div class="card" style="padding:0.75rem">
          <div style="font-size:0.75rem;color:var(--text3)">ESTIMATED PRICE</div>
          <div style="font-family:Fraunces,serif;font-size:1.3rem;color:var(--accent)">
            ${s.min_estimated_price ? `PKR ${s.min_estimated_price}–${s.max_estimated_price || '?'}` : 'On Request'}
            <span style="font-size:0.8rem;color:var(--text3);font-family:'DM Sans',sans-serif">/${s.price_unit}</span>
          </div>
        </div>
        <div class="card" style="padding:0.75rem">
          <div style="font-size:0.75rem;color:var(--text3)">RATING</div>
          <div class="stars" style="font-size:1.1rem">${renderStars(s.avg_rating)}</div>
          <div style="font-size:0.8rem;color:var(--text3)">${Number(s.avg_rating).toFixed(1)} from ${s.review_count} reviews</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:1rem;padding:1rem">
        <div style="font-size:0.75rem;color:var(--text3);margin-bottom:0.5rem">PROVIDER</div>
        <div style="font-weight:500">${s.business_name || s.full_name}</div>
        <div style="font-size:0.85rem;color:var(--text2)">${s.occupation || ''} ${s.experience_years ? `• ${s.experience_years} yrs experience` : ''}</div>
        ${s.location ? `<div style="font-size:0.85rem;color:var(--text2)">📍 ${s.location}</div>` : ''}
        ${s.bio ? `<div style="font-size:0.83rem;color:var(--text3);margin-top:0.5rem">${s.bio}</div>` : ''}
      </div>
      ${s.availability.length ? `
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text3);margin-bottom:0.5rem">AVAILABILITY</div>
        <div class="avail-grid">
          ${s.availability.map(a => `<div class="avail-chip">${a.day_of_week} ${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}</div>`).join('')}
        </div>
      </div>` : ''}
      ${s.reviews.length ? `
      <div>
        <div style="font-size:0.75rem;color:var(--text3);margin-bottom:0.75rem">REVIEWS</div>
        ${s.reviews.slice(0,3).map(r => `
          <div style="border-bottom:1px solid var(--border);padding:0.75rem 0;font-size:0.875rem">
            <div style="display:flex;justify-content:space-between">
              <span style="font-weight:500">${r.full_name}</span>
              <span class="stars" style="font-size:0.8rem">${renderStars(r.rating)}</span>
            </div>
            ${r.comment ? `<div style="color:var(--text2);margin-top:0.25rem">${r.comment}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}
      ${auth.isLoggedIn() && auth.isCustomer() ? `
      <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button class="btn btn-primary btn-block" onclick="openBookingForm(${s.service_id}, '${s.title}')">
          Book this Service — PKR 5 Booking Fee
        </button>
      </div>` : !auth.isLoggedIn() ? `
      <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button class="btn btn-secondary btn-block" onclick="closeModal('modal-service-detail');openModal('modal-login')">Login to Book</button>
      </div>` : ''}
    `;
    openModal('modal-service-detail');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── BOOKING FORM ───
function openBookingForm(serviceId, serviceTitle) {
  closeModal('modal-service-detail');
  document.getElementById('booking-service-title').textContent = serviceTitle;
  document.getElementById('booking-service-id').value = serviceId;
  openModal('modal-booking');
}

async function handleBooking(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    service_id: form.querySelector('#booking-service-id').value,
    booking_type: form.querySelector('[name=booking_type]').value,
    start_datetime: form.querySelector('[name=start_datetime]').value,
    end_datetime: form.querySelector('[name=end_datetime]').value
  };
  try {
    await api.post('/bookings', data);
    closeModal('modal-booking');
    toast('Booking submitted! PKR 5 booking fee pending.');
    if (auth.isCustomer()) { showPage('dashboard'); }
  } catch (err) {
    form.querySelector('.form-error').textContent = err.message;
  }
}

// ─── DASHBOARD ───
async function loadDashboard() {
  if (!auth.isLoggedIn()) { showPage('home'); return; }
  const user = auth.getUser();

  // Load profile
  try {
    const profile = await api.get('/users/me');
    document.getElementById('dash-name').textContent = profile.full_name;
    document.getElementById('dash-type').textContent = profile.user_type;
    document.getElementById('dash-email').textContent = profile.email;

    // Populate profile form
    const pf = document.getElementById('profile-form');
    ['full_name','phone','business_name','occupation','bio','location','experience_years','address'].forEach(k => {
      const el = pf.querySelector(`[name=${k}]`);
      if (el) el.value = profile[k] || '';
    });

    // Show/hide provider/customer sections
    document.getElementById('dash-provider-section').style.display = auth.isProvider() ? '' : 'none';
    document.getElementById('dash-customer-section').style.display = auth.isCustomer() ? '' : 'none';

    if (auth.isProvider()) await loadProviderData();
    if (auth.isCustomer()) await loadCustomerData();
    if (auth.isAdmin()) { showPage('admin'); return; }
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadProviderData() {
  try {
    const [services, bookings] = await Promise.all([
      api.get('/services/my/services'),
      api.get('/bookings/provider')
    ]);
    document.getElementById('provider-services-list').innerHTML = services.length
      ? services.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:500">${s.title}</div>
            <div style="font-size:0.8rem;color:var(--text2)">${s.category_name} · ${s.total_bookings} bookings</div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span class="status ${s.is_active ? 'status-active' : 'status-inactive'}">${s.is_active ? 'Active' : 'Inactive'}</span>
            <button class="btn btn-secondary btn-sm" onclick="editService(${s.service_id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteService(${s.service_id})">Delete</button>
          </div>
        </div>`).join('')
      : '<div class="empty-state"><h3>No services yet</h3></div>';

    document.getElementById('provider-bookings-list').innerHTML = bookings.length
      ? `<div class="table-wrap"><table><thead><tr><th>Service</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>` +
        bookings.map(b => `<tr>
          <td>${b.service_title}</td>
          <td>${b.customer_name}</td>
          <td>${fmtDateTime(b.start_datetime)}</td>
          <td>PKR ${b.total_amount}</td>
          <td><span class="status status-${b.status}">${b.status}</span></td>
          <td style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${b.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="updateBookingStatus(${b.booking_id},'confirmed')">Confirm</button>` : ''}
            ${b.status === 'confirmed' ? `<button class="btn btn-primary btn-sm" onclick="updateBookingStatus(${b.booking_id},'completed')">Complete</button>` : ''}
            ${['pending','confirmed'].includes(b.status) ? `<button class="btn btn-danger btn-sm" onclick="updateBookingStatus(${b.booking_id},'cancelled')">Cancel</button>` : ''}
          </td>
        </tr>`).join('') + '</tbody></table></div>'
      : '<div class="empty-state"><h3>No bookings yet</h3></div>';
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadCustomerData() {
  try {
    const bookings = await api.get('/bookings/my');
    document.getElementById('customer-bookings-list').innerHTML = bookings.length
      ? `<div class="table-wrap"><table><thead><tr><th>Service</th><th>Provider</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>` +
        bookings.map(b => `<tr>
          <td>${b.service_title}</td>
          <td>${b.business_name || b.provider_name}</td>
          <td>${fmtDateTime(b.start_datetime)}</td>
          <td>PKR ${b.total_amount}</td>
          <td><span class="status status-${b.payment_status || 'pending'}">${b.payment_status || 'pending'}</span></td>
          <td><span class="status status-${b.status}">${b.status}</span></td>
          <td>${b.status === 'completed' && !b.rating ? `<button class="btn btn-primary btn-sm" onclick="openReviewModal(${b.booking_id})">Review</button>` : b.rating ? `<span class="stars">${renderStars(b.rating)}</span>` : ''}</td>
        </tr>`).join('') + '</tbody></table></div>'
      : '<div class="empty-state"><h3>No bookings yet</h3><p>Browse services to get started</p><button class="btn btn-primary" onclick="showPage(\'services\')" style="margin-top:1rem">Browse Services</button></div>';
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateBookingStatus(id, status) {
  try {
    await api.put(`/bookings/${id}/status`, { status });
    toast(`Booking ${status}`);
    loadProviderData();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── PROFILE UPDATE ───
async function handleProfileUpdate(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  form.querySelectorAll('[name]').forEach(el => data[el.name] = el.value);
  try {
    await api.put('/users/me', data);
    toast('Profile updated!');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── SERVICE MANAGEMENT ───
let availabilitySlots = [];

function openCreateService() {
  availabilitySlots = [];
  document.getElementById('create-service-form').reset();
  document.getElementById('avail-slots').innerHTML = '';
  loadCategoriesForForm();
  openModal('modal-create-service');
}

async function loadCategoriesForForm() {
  try {
    const cats = await api.get('/categories');
    const sel = document.getElementById('service-category-select');
    sel.innerHTML = cats.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
  } catch (err) {}
}

function addAvailabilitySlot() {
  const day = document.getElementById('avail-day').value;
  const start = document.getElementById('avail-start').value;
  const end = document.getElementById('avail-end').value;
  if (!start || !end) return toast('Enter start and end times', 'error');
  availabilitySlots.push({ day_of_week: day, start_time: start, end_time: end });
  renderAvailSlots();
}

function renderAvailSlots() {
  document.getElementById('avail-slots').innerHTML = availabilitySlots.map((s, i) =>
    `<div class="avail-chip">${s.day_of_week} ${s.start_time}–${s.end_time} <span class="remove" onclick="availabilitySlots.splice(${i},1);renderAvailSlots()">✕</span></div>`
  ).join('');
}

async function handleCreateService(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    title: form.querySelector('[name=title]').value,
    description: form.querySelector('[name=description]').value,
    category_id: form.querySelector('[name=category_id]').value,
    min_estimated_price: form.querySelector('[name=min_price]').value || null,
    max_estimated_price: form.querySelector('[name=max_price]').value || null,
    price_unit: form.querySelector('[name=price_unit]').value,
    booking_type: form.querySelector('[name=booking_type]').value,
    availability: availabilitySlots
  };
  try {
    await api.post('/services', data);
    closeModal('modal-create-service');
    toast('Service created!');
    loadProviderData();
  } catch (err) {
    form.querySelector('.form-error').textContent = err.message;
  }
}

async function deleteService(id) {
  if (!confirm('Delete this service?')) return;
  try {
    await api.delete(`/services/${id}`);
    toast('Service deleted');
    loadProviderData();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function editService(id) {
  try {
    const s = await api.get(`/services/${id}`);
    const cats = await api.get('/categories');
    const sel = document.getElementById('edit-service-category');
    sel.innerHTML = cats.map(c => `<option value="${c.category_id}" ${c.category_id == s.category_id ? 'selected' : ''}>${c.category_name}</option>`).join('');
    const form = document.getElementById('edit-service-form');
    form.querySelector('[name=title]').value = s.title;
    form.querySelector('[name=description]').value = s.description || '';
    form.querySelector('[name=min_price]').value = s.min_estimated_price || '';
    form.querySelector('[name=max_price]').value = s.max_estimated_price || '';
    form.querySelector('[name=price_unit]').value = s.price_unit;
    form.querySelector('[name=booking_type]').value = s.booking_type;
    form.querySelector('[name=is_active]').value = s.is_active ? '1' : '0';
    form.dataset.serviceId = id;
    openModal('modal-edit-service');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleEditService(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.dataset.serviceId;
  const data = {
    title: form.querySelector('[name=title]').value,
    description: form.querySelector('[name=description]').value,
    category_id: document.getElementById('edit-service-category').value,
    min_estimated_price: form.querySelector('[name=min_price]').value || null,
    max_estimated_price: form.querySelector('[name=max_price]').value || null,
    price_unit: form.querySelector('[name=price_unit]').value,
    booking_type: form.querySelector('[name=booking_type]').value,
    is_active: form.querySelector('[name=is_active]').value === '1'
  };
  try {
    await api.put(`/services/${id}`, data);
    closeModal('modal-edit-service');
    toast('Service updated!');
    loadProviderData();
  } catch (err) {
    form.querySelector('.form-error').textContent = err.message;
  }
}

// ─── REVIEW ───
function openReviewModal(bookingId) {
  document.getElementById('review-booking-id').value = bookingId;
  document.getElementById('review-form').reset();
  openModal('modal-review');
}

async function handleReview(e) {
  e.preventDefault();
  const form = e.target;
  // We need the reviewed user id — for simplicity get it from the booking
  const bookingId = form.querySelector('#review-booking-id').value;
  const rating = form.querySelector('[name=rating]').value;
  const comment = form.querySelector('[name=comment]').value;
  // Get provider user_id from bookings
  try {
    const bookings = await api.get('/bookings/my');
    const booking = bookings.find(b => b.booking_id == bookingId);
    // We need provider user_id — use the API to get service detail
    const svc = await api.get(`/services/${booking.service_id || 0}`);
    await api.post('/reviews', { booking_id: bookingId, reviewed_user_id: svc.user_id, rating, comment });
    closeModal('modal-review');
    toast('Review submitted!');
    loadCustomerData();
  } catch (err) {
    form.querySelector('.form-error').textContent = err.message;
  }
}

// ─── ADMIN ───
let adminTab = 'users';

async function loadAdmin() {
  if (!auth.isAdmin()) { showPage('home'); return; }
  try {
    const stats = await api.get('/admin/stats');
    document.getElementById('admin-stat-users').textContent = stats.total_users;
    document.getElementById('admin-stat-pending').textContent = stats.pending_verifications;
    document.getElementById('admin-stat-bookings').textContent = stats.total_bookings;
    document.getElementById('admin-stat-revenue').textContent = 'PKR ' + Number(stats.total_revenue).toFixed(0);
  } catch (err) {}
  loadAdminTab('users');
}

async function loadAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.tab-btn[data-admin-tab]').forEach(b => b.classList.toggle('active', b.dataset.adminTab === tab));
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.toggle('active', p.id === `admin-tab-${tab}`));

  if (tab === 'users') {
    try {
      const users = await api.get('/admin/users');
      document.getElementById('admin-users-table').innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Verify</th><th>Actions</th></tr></thead><tbody>` +
        users.map(u => `<tr>
          <td>${u.full_name} ${u.admin_id ? '<span class="badge badge-verified">Admin</span>' : ''}</td>
          <td style="color:var(--text2)">${u.email}</td>
          <td>${u.user_type}</td>
          <td><span class="status status-${u.status}">${u.status}</span></td>
          <td>${u.verification_status ? `<span class="badge badge-${u.verification_status}">${u.verification_status}</span>` : '—'}</td>
          <td style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${u.status !== 'blocked' ? `<button class="btn btn-danger btn-sm" onclick="adminSetUserStatus(${u.user_id},'blocked')">Block</button>` : `<button class="btn btn-success btn-sm" onclick="adminSetUserStatus(${u.user_id},'active')">Unblock</button>`}
            ${u.verification_status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="adminVerifyProvider(${u.user_id},'verified')">Verify</button><button class="btn btn-secondary btn-sm" onclick="adminVerifyProvider(${u.user_id},'rejected')">Reject</button>` : ''}
          </td>
        </tr>`).join('') + '</tbody></table></div>';
    } catch (err) { toast(err.message, 'error'); }
  } else if (tab === 'bookings') {
    try {
      const bookings = await api.get('/admin/bookings');
      document.getElementById('admin-bookings-table').innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>Service</th><th>Provider</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead><tbody>` +
        bookings.map(b => `<tr>
          <td>${b.service_title}</td>
          <td>${b.provider_name}</td>
          <td>${b.customer_name}</td>
          <td>PKR ${b.total_amount}</td>
          <td><span class="status status-${b.payment_status || 'pending'}">${b.payment_status || 'pending'}</span></td>
          <td><span class="status status-${b.status}">${b.status}</span></td>
        </tr>`).join('') + '</tbody></table></div>';
    } catch (err) { toast(err.message, 'error'); }
  } else if (tab === 'categories') {
    loadAdminCategories();
  }
}

async function adminSetUserStatus(userId, status) {
  try {
    await api.put(`/admin/users/${userId}/status`, { status });
    toast(`User ${status}`);
    loadAdminTab('users');
  } catch (err) { toast(err.message, 'error'); }
}

async function adminVerifyProvider(userId, status) {
  try {
    // Get provider_id from user
    const users = await api.get('/admin/users');
    const u = users.find(x => x.user_id == userId);
    // Find provider_id — we use the verification endpoint with provider_id
    // Workaround: call with user_id mapped to provider via a direct update
    const res = await fetch('/api/admin/providers/0/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.getToken()}` },
      body: JSON.stringify({ verification_status: status, user_id: userId })
    });
    // Better approach: update directly by user_id
    await fetch('/api/admin/verify-by-user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.getToken()}` },
      body: JSON.stringify({ user_id: userId, verification_status: status })
    });
    toast(`Provider ${status}`);
    loadAdminTab('users');
  } catch (err) { toast(err.message, 'error'); }
}

async function loadAdminCategories() {
  try {
    const cats = await api.get('/admin/categories');
    document.getElementById('admin-categories-list').innerHTML =
      cats.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem;background:var(--bg3);border-radius:8px;margin-bottom:0.5rem">
          <div>
            <div style="font-weight:500">${c.category_name}</div>
            <div style="font-size:0.8rem;color:var(--text2)">${c.description || ''}</div>
          </div>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-secondary btn-sm" onclick="editCategory(${c.category_id},'${c.category_name}','${c.description||''}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.category_id})">Delete</button>
          </div>
        </div>`).join('');
  } catch (err) { toast(err.message, 'error'); }
}

async function handleAddCategory(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name=cat_name]').value;
  const desc = form.querySelector('[name=cat_desc]').value;
  try {
    await api.post('/admin/categories', { category_name: name, description: desc });
    toast('Category added');
    form.reset();
    loadAdminCategories();
  } catch (err) { toast(err.message, 'error'); }
}

function editCategory(id, name, desc) {
  document.getElementById('edit-cat-id').value = id;
  document.getElementById('edit-cat-name').value = name;
  document.getElementById('edit-cat-desc').value = desc;
  openModal('modal-edit-category');
}

async function handleEditCategory(e) {
  e.preventDefault();
  const id = document.getElementById('edit-cat-id').value;
  const name = document.getElementById('edit-cat-name').value;
  const desc = document.getElementById('edit-cat-desc').value;
  try {
    await api.put(`/admin/categories/${id}`, { category_name: name, description: desc });
    closeModal('modal-edit-category');
    toast('Category updated');
    loadAdminCategories();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    await api.delete(`/admin/categories/${id}`);
    toast('Category deleted');
    loadAdminCategories();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  showPage('home');
});
