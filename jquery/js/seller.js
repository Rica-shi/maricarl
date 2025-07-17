// seller.js

document.addEventListener('DOMContentLoaded', function() {
  // Role check
  if (localStorage.getItem('user_role') !== 'seller') {
    window.location.href = '../login.html?reason=unauthorized';
    return;
  }

  // Determine which page we're on
  const isProductPage = window.location.pathname.includes('products.html');
  const isCategoryPage = window.location.pathname.includes('categories.html');

  if (isProductPage) initProductPage();
  if (isCategoryPage) initCategoryPage();
});

// ---------------- PRODUCTS ----------------
function initProductPage() {
  const productsTable = document.getElementById('productsTable').getElementsByTagName('tbody')[0];
  const addBtn = document.getElementById('addProductBtn');
  const productModal = new bootstrap.Modal(document.getElementById('productModal'));
  const productForm = document.getElementById('productForm');

  let categories = [];
  let editingId = null;

  // Load categories for dropdown
  fetchCategories().then(cats => {
    categories = cats;
    populateCategoryDropdown();
  });

  // Load products
  loadProducts();

  addBtn.onclick = function() {
    editingId = null;
    productForm.reset();
    document.getElementById('productId').value = '';
    productModal.show();
    populateCategoryDropdown();
  };

  productForm.onsubmit = function(e) {
    e.preventDefault();
    const data = {
      category_id: document.getElementById('productCategory').value,
      name: document.getElementById('productName').value,
      sku: document.getElementById('productSKU').value,
      sell_price: document.getElementById('productPrice').value,
      image: document.getElementById('productImage').value,
      status: document.getElementById('productStatus').value,
      description: document.getElementById('productDescription') ? document.getElementById('productDescription').value : ''
    };
    if (editingId) {
      updateProduct(editingId, data, () => {
        productModal.hide();
        loadProducts();
      });
    } else {
      addProduct(data, () => {
        productModal.hide();
        loadProducts();
      });
    }
  };

  function populateCategoryDropdown() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.category_id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }

  function loadProducts() {
    const API_BASE = 'http://localhost:4000';
    fetch(API_BASE + '/api/v1/seller/products', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
    })
      .then(res => res.json())
      .then(data => {
        productsTable.innerHTML = '';
        if (data.success && data.products) {
          data.products.forEach(prod => {
            const row = productsTable.insertRow();
            row.insertCell().textContent = prod.name;
            row.insertCell().textContent = categories.find(c => c.category_id == prod.category_id)?.name || '';
            row.insertCell().textContent = prod.sku;
            row.insertCell().textContent = prod.sell_price;
            row.insertCell().textContent = prod.status;
            const actions = row.insertCell();
            actions.innerHTML = `
              <button class="btn btn-sm btn-warning edit-btn">Edit</button>
              <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            `;
            actions.querySelector('.edit-btn').onclick = function() {
              editingId = prod.item_id;
              document.getElementById('productId').value = prod.item_id;
              document.getElementById('productName').value = prod.name;
              document.getElementById('productCategory').value = prod.category_id;
              document.getElementById('productSKU').value = prod.sku;
              document.getElementById('productPrice').value = prod.sell_price;
              document.getElementById('productImage').value = prod.image;
              document.getElementById('productStatus').value = prod.status;
              productModal.show();
            };
            actions.querySelector('.delete-btn').onclick = function() {
              if (confirm('Delete this product?')) {
                deleteProduct(prod.item_id, loadProducts);
              }
            };
          });
        }
      });
  }
}

function addProduct(data, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(cb);
}

function updateProduct(id, data, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/products/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(cb);
}

function deleteProduct(id, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/products/' + id, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    }
  })
    .then(res => res.json())
    .then(cb);
}

// ---------------- CATEGORIES ----------------
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
    const API_BASE = 'http://localhost:4000';
    fetch(API_BASE + '/api/v1/seller/categories', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
    })
      .then(res => res.json())
      .then(data => {
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
  const API_BASE = 'http://localhost:4000';
  return fetch(API_BASE + '/api/v1/seller/categories', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
  })
    .then(res => res.json())
    .then(data => data.success ? data.categories : []);
}

function addCategory(data, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(cb);
}

function updateCategory(id, data, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/categories/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(cb);
}

function deleteCategory(id, cb) {
  const API_BASE = 'http://localhost:4000';
  fetch(API_BASE + '/api/v1/seller/categories/' + id, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    }
  })
    .then(res => res.json())
    .then(cb);
} 