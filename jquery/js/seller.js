// IMPORTANT: If you get CORS errors, add this to your Node.js backend (e.g., in app.js):
// const cors = require('cors');
// app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// seller.js

document.addEventListener('DOMContentLoaded', function() {
  if (!ensureSellerAuth()) return;
  // Role check
  if (localStorage.getItem('user_role') !== 'seller') {
    window.location.href = '../login.html?reason=unauthorized';
    return;
  }
  // Only use the modern approach for products
  if (document.querySelector('#productsTable')) {
    loadAndRenderProducts();
    setupProductFormEvents();
  }
  // Category page logic (unchanged)
  if (window.location.pathname.includes('categories.html')) {
    initCategoryPage();
  }
});

// Set the correct API base and paths for a backend mounted at /api/v1
const API_BASE = 'http://localhost:4000';
const PRODUCTS_API = API_BASE + '/api/v1/seller/products';
const CATEGORIES_API = API_BASE + '/api/v1/seller/categories';

// Utility: Get JWT and check role
function getJwt() {
  return localStorage.getItem('jwt_token');
}
function getUserRole() {
  return localStorage.getItem('user_role');
}
function ensureSellerAuth() {
  const jwt = getJwt();
  const role = getUserRole();
  if (!jwt || role !== 'seller') {
    window.location.href = '../login.html?reason=unauthorized';
    return false;
  }
  return true;
}

// Utility to escape HTML
function escapeHtml(text) {
  return text ? text.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c])) : '';
}

// Action buttons for product table
function getActionButtons(product) {
  const statusBtn = product.status === 'active'
    ? `<button class="btn btn-gray btn-sm status-btn" data-id="${product.item_id}" title="Set Inactive">Inactive</button>`
    : `<button class="btn btn-blue btn-sm status-btn" data-id="${product.item_id}" title="Set Active">Active</button>`;
  return `
    <button class="btn btn-red btn-sm delete-btn" data-id="${product.item_id}" title="Delete">Delete</button>
    <button class="btn btn-beige btn-sm edit-btn" data-id="${product.item_id}" title="Edit">Edit</button>
    ${statusBtn}
  `;
}

// Render products in the table
function renderProductsTable(products, categories) {
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';
  if (!products || products.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align:center; color:#aaa;">No products found.</td>`;
    tbody.appendChild(tr);
    return;
  }
  products.forEach(product => {
    const tr = document.createElement('tr');
    // Id
    tr.innerHTML += `<td>${product.item_id}</td>`;
    // Name
    tr.innerHTML += `<td>${escapeHtml(product.name)}</td>`;
    // Price
    tr.innerHTML += `<td>₱${parseFloat(product.sell_price).toLocaleString()}</td>`;
    // Category
    const cat = categories.find(c => c.category_id == product.category_id);
    tr.innerHTML += `<td>${cat ? escapeHtml(cat.name) : ''}</td>`;
    // Photo (thumbnails)
    let imgs = '';
    if (Array.isArray(product.image) && product.image.length > 0) {
      imgs = `<img src="${product.image[0]}" class="img-thumb" alt="Product Image">`;
      if (product.image.length > 1) {
        imgs += `<span class="photo-count-box">${product.image.length}+</span>`;
      }
    }
    tr.innerHTML += `<td><div class="img-thumb-wrapper">${imgs}</div></td>`;
    // Status
    const statusClass = product.status === 'inactive' ? 'status-badge status-inactive' : 'status-badge';
    tr.innerHTML += `<td><span class="${statusClass}">${escapeHtml(product.status)}</span></td>`;
    // Actions
    tr.innerHTML += `<td>${getActionButtons(product)}</td>`;
    tbody.appendChild(tr);
  });
}

// Fetch and render products and categories with detailed error logging
async function loadAndRenderProducts() {
  if (!ensureSellerAuth()) return;
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(PRODUCTS_API, { headers: { 'Authorization': 'Bearer ' + getJwt() } }),
      fetch(CATEGORIES_API, { headers: { 'Authorization': 'Bearer ' + getJwt() } })
    ]);
    const productsData = await productsRes.json();
    const categoriesData = await categoriesRes.json();
    if (productsData.success && categoriesData.success) {
      renderProductsTable(productsData.products, categoriesData.categories);
      window._lastProducts = productsData.products; // Store for quick access
      window._lastCategories = categoriesData.categories;
    } else {
      renderProductsTable([], []);
      if (!productsData.success) {
        console.error('Products API error:', productsData);
        alert(productsData.message || 'Failed to load products.');
      }
      if (!categoriesData.success) {
        console.error('Categories API error:', categoriesData);
        alert(categoriesData.message || 'Failed to load categories.');
      }
    }
  } catch (err) {
    console.error('Error fetching products or categories:', err);
    alert('Error fetching products or categories. See console for details.');
    renderProductsTable([], []);
  }
}

// Helper: Populate category dropdown from database
async function populateCategoryDropdown(selectedId = null) {
  const select = document.getElementById('productCategory');
  select.innerHTML = '';
  // Add a blank option at the top
  const blankOpt = document.createElement('option');
  blankOpt.value = '';
  blankOpt.textContent = 'Select a category...';
  select.appendChild(blankOpt);
  try {
    const categories = await fetchCategories();
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.category_id;
      opt.textContent = cat.name;
      if (selectedId && selectedId == cat.category_id) opt.selected = true;
      select.appendChild(opt);
    });
    // If not editing, leave blank option selected
    if (!selectedId) select.value = '';
  } catch (err) {
    select.innerHTML = '<option value="">Failed to load categories</option>';
  }
}

// Update showProductModal to always populate categories
function showProductModal(editing = false, product = null) {
  const modal = document.getElementById('productModal');
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productId').value = '';
  document.getElementById('existingImagesSection').style.display = 'none';
  // Set modal title
  const modalTitle = document.querySelector('.custom-modal-title');
  if (modalTitle) {
    modalTitle.textContent = editing ? 'Edit Product' : 'Add Product';
  }
  // Always populate categories before showing modal
  populateCategoryDropdown(editing && product ? product.category_id : null);
  if (editing && product) {
    document.getElementById('productId').value = product.item_id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productSKU').value = product.sku;
    document.getElementById('productPrice').value = product.sell_price;
    document.getElementById('productStock').value = product.stock || '';
    document.getElementById('productStatus').value = product.status;
    document.getElementById('productDescription').value = product.description || '';
    // Show existing images
    if (Array.isArray(product.image) && product.image.length > 0) {
      const existingImages = document.getElementById('existingImages');
      existingImages.innerHTML = product.image.map(img => `<img src="${img}" class="img-thumb" alt="Product Image">`).join('');
      document.getElementById('existingImagesSection').style.display = 'block';
    }
  }
  modal.style.display = 'flex';
}
function hideProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

// Event listeners for Add Product, Edit, Cancel, Close, and table actions
function setupProductFormEvents() {
  // Modal open/close
  document.getElementById('addProductBtn').onclick = () => showProductModal(false);
  document.getElementById('cancelProductBtn').onclick = hideProductModal;
  document.getElementById('closeProductModalBtn').onclick = hideProductModal;
  // Form submit
  document.getElementById('productForm').onsubmit = function(e) {
    e.preventDefault();
    if (!ensureSellerAuth()) return;
    const editingId = document.getElementById('productId').value;
    const formData = new FormData(this);
    // Always set all required fields (except images, which is handled by the browser)
    formData.set('category_id', document.getElementById('productCategory').value);
    formData.set('name', document.getElementById('productName').value);
    formData.set('sku', document.getElementById('productSKU').value);
    formData.set('sell_price', document.getElementById('productPrice').value);
    formData.set('stock', document.getElementById('productStock').value);
    formData.set('status', document.getElementById('productStatus').value);
    formData.set('description', document.getElementById('productDescription').value || '');
    // Do NOT set 'images' in JS; let the browser handle file uploads
    // Debug: log all FormData keys/values
    for (let pair of formData.entries()) {
      console.log(pair[0]+ ': ' + pair[1]);
    }
    if (editingId) {
      updateProduct(editingId, formData, (res) => {
        if (res && res.success) {
          hideProductModal();
          loadAndRenderProducts();
        } else {
          alert(res && res.message ? res.message : 'Failed to update product.');
        }
      });
    } else {
      addProduct(formData, (res) => {
        if (res && res.success) {
          hideProductModal();
          loadAndRenderProducts();
        } else {
          alert(res && res.message ? res.message : 'Failed to add product.');
        }
      });
    }
  };
  // Table actions (edit, delete, status, add photo)
  document.querySelector('#productsTable').addEventListener('click', function(e) {
    const rowBtn = e.target.closest('button');
    if (!rowBtn) return;
    const id = rowBtn.dataset.id;
    const product = window._lastProducts.find(p => p.item_id == id);
    if (rowBtn.classList.contains('edit-btn')) {
      showProductModal(true, product);
    } else if (rowBtn.classList.contains('delete-btn')) {
      console.log('Delete clicked for id:', id);
      if (confirm('Delete this product?')) {
        deleteProduct(id, (res) => {
          if (res && res.success) {
            loadAndRenderProducts();
          } else {
            alert(res && res.message ? res.message : 'Failed to delete product.');
          }
        });
      }
    } else if (rowBtn.classList.contains('status-btn')) {
      // Toggle status
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      const formData = new FormData();
      formData.set('category_id', product.category_id);
      formData.set('name', product.name);
      formData.set('description', product.description);
      formData.set('sku', product.sku);
      formData.set('sell_price', product.sell_price);
      formData.set('status', newStatus);
      formData.set('stock', product.stock || 0);
      updateProduct(id, formData, (res) => {
        if (res && res.success) {
          loadAndRenderProducts();
        } else {
          alert(res && res.message ? res.message : 'Failed to update status.');
        }
      });
    } else if (rowBtn.classList.contains('add-photo-btn')) {
      alert('Add photo feature coming soon!');
    }
  });
}

// Add product (multipart/form-data)
function addProduct(formData, cb) {
  if (!ensureSellerAuth()) return;
  fetch(PRODUCTS_API, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + getJwt()
    },
    body: formData
  })
    .then(async res => {
      let data;
      try { data = await res.json(); } catch { data = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Add product error:', data);
        alert(data.message || 'Failed to add product.');
      }
      cb(data);
    })
    .catch(err => {
      console.error('Add product error:', err);
      alert('Failed to add product. See console for details.');
    });
}

// Update product (multipart/form-data)
function updateProduct(id, formData, cb) {
  if (!ensureSellerAuth()) return;
  fetch(PRODUCTS_API + '/' + id, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + getJwt()
    },
    body: formData
  })
    .then(async res => {
      let data;
      try { data = await res.json(); } catch { data = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Update product error:', data);
        alert(data.message || 'Failed to update product.');
      }
      cb(data);
    })
    .catch(err => {
      console.error('Update product error:', err);
      alert('Failed to update product. See console for details.');
    });
}

// Delete product
function deleteProduct(id, cb) {
  if (!ensureSellerAuth()) return;
  fetch(PRODUCTS_API + '/' + id, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + getJwt()
    }
  })
    .then(async res => {
      let data;
      try { data = await res.json(); } catch { data = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Delete product error:', data);
        alert(data.message || 'Failed to delete product.');
      }
      cb(data);
    })
    .catch(err => {
      console.error('Delete product error:', err);
      alert('Failed to delete product. See console for details.');
    });
}

// ---------------- CATEGORIES (unchanged) ----------------
function initCategoryPage() {
  const categoriesTable = document.getElementById('categoriesTable').getElementsByTagName('tbody')[0];
  const addBtn = document.getElementById('addCategoryBtn');
  const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
  const categoryForm = document.getElementById('categoryForm');
  let editingId = null;

  loadCategories();

  addBtn.onclick = function() {
    editingId = null;
    categoryForm.reset();
    document.getElementById('categoryId').value = '';
    categoryModal.show();
  };

  categoryForm.onsubmit = function(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('categoryName').value,
      description: document.getElementById('categoryDescription').value,
      is_active: document.getElementById('categoryStatus').value
    };
    if (editingId) {
      updateCategory(editingId, data, () => {
        categoryModal.hide();
        loadCategories();
      });
    } else {
      addCategory(data, () => {
        categoryModal.hide();
        loadCategories();
      });
    }
  };

  function loadCategories() {
    fetch(CATEGORIES_API, {
      headers: { 'Authorization': 'Bearer ' + getJwt() }
    })
      .then(async res => {
        let data;
        try { data = await res.json(); } catch { data = { success: false, message: 'Invalid JSON from server.' }; }
        if (!res.ok) {
          console.error('Fetch categories error:', data);
          alert(data.message || 'Failed to fetch categories.');
        }
        categoriesTable.innerHTML = '';
        if (data.success && data.categories) {
          data.categories.forEach(cat => {
            const row = categoriesTable.insertRow();
            row.insertCell().textContent = cat.name;
            row.insertCell().textContent = cat.description;
            row.insertCell().textContent = cat.is_active == 1 ? 'Active' : 'Inactive';
            const actions = row.insertCell();
            actions.innerHTML = `
              <button class="btn btn-sm btn-warning edit-btn">Edit</button>
              <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            `;
            actions.querySelector('.edit-btn').onclick = function() {
              editingId = cat.category_id;
              document.getElementById('categoryId').value = cat.category_id;
              document.getElementById('categoryName').value = cat.name;
              document.getElementById('categoryDescription').value = cat.description;
              document.getElementById('categoryStatus').value = cat.is_active;
              categoryModal.show();
            };
            actions.querySelector('.delete-btn').onclick = function() {
              if (confirm('Delete this category?')) {
                deleteCategory(cat.category_id, loadCategories);
              }
            };
          });
        }
      });
  }
}

function fetchCategories() {
  return fetch(CATEGORIES_API, {
    headers: { 'Authorization': 'Bearer ' + getJwt() }
  })
    .then(async res => {
      let data;
      try { data = await res.json(); } catch { data = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Fetch categories error:', data);
        alert(data.message || 'Failed to fetch categories.');
      }
      return data.success ? data.categories : [];
    })
    .catch(err => {
      console.error('Fetch categories error:', err);
      alert('Failed to fetch categories. See console for details.');
      return [];
    });
}

function addCategory(data, cb) {
  fetch(CATEGORIES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getJwt()
    },
    body: JSON.stringify(data)
  })
    .then(async res => {
      let resp;
      try { resp = await res.json(); } catch { resp = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Add category error:', resp);
        alert(resp.message || 'Failed to add category.');
      }
      cb(resp);
    })
    .catch(err => {
      console.error('Add category error:', err);
      alert('Failed to add category. See console for details.');
    });
}

function updateCategory(id, data, cb) {
  fetch(CATEGORIES_API + '/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getJwt()
    },
    body: JSON.stringify(data)
  })
    .then(async res => {
      let resp;
      try { resp = await res.json(); } catch { resp = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Update category error:', resp);
        alert(resp.message || 'Failed to update category.');
      }
      cb(resp);
    })
    .catch(err => {
      console.error('Update category error:', err);
      alert('Failed to update category. See console for details.');
    });
}

function deleteCategory(id, cb) {
  fetch(CATEGORIES_API + '/' + id, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + getJwt()
    }
  })
    .then(async res => {
      let resp;
      try { resp = await res.json(); } catch { resp = { success: false, message: 'Invalid JSON from server.' }; }
      if (!res.ok) {
        console.error('Delete category error:', resp);
        alert(resp.message || 'Failed to delete category.');
      }
      cb(resp);
    })
    .catch(err => {
      console.error('Delete category error:', err);
      alert('Failed to delete category. See console for details.');
    });
} 