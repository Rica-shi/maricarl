const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('./auth');

// Middleware to check if user is a seller
function requireSellerRole(req, res, next) {
  if (req.user && req.user.role === 'seller') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Seller only.' });
}

// ----------- PRODUCTS CRUD -----------
// GET all products for this seller
router.get('/seller/products', authenticateJWT, requireSellerRole, async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM item WHERE seller_id = ?', [req.user.id]);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// ADD a new product
router.post('/seller/products', authenticateJWT, requireSellerRole, async (req, res) => {
  const { category_id, name, description, sku, sell_price, image, status } = req.body;
  if (!category_id || !name || !sku || !sell_price || !image) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  try {
    await db.query(
      'INSERT INTO item (category_id, name, description, sku, sell_price, image, status, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [category_id, name, description || '', sku, sell_price, image, status || 'active', req.user.id]
    );
    res.json({ success: true, message: 'Product added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add product.' });
  }
});

// UPDATE a product
router.put('/seller/products/:id', authenticateJWT, requireSellerRole, async (req, res) => {
  const { category_id, name, description, sku, sell_price, image, status } = req.body;
  try {
    // Only update if the product belongs to this seller
    const [result] = await db.query(
      'UPDATE item SET category_id=?, name=?, description=?, sku=?, sell_price=?, image=?, status=? WHERE item_id=? AND seller_id=?',
      [category_id, name, description, sku, sell_price, image, status, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by you.' });
    }
    res.json({ success: true, message: 'Product updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE a product
router.delete('/seller/products/:id', authenticateJWT, requireSellerRole, async (req, res) => {
  try {
    // Only delete if the product belongs to this seller
    const [result] = await db.query('DELETE FROM item WHERE item_id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not owned by you.' });
    }
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

// ----------- CATEGORIES CRUD -----------
// GET all categories (global)
router.get('/seller/categories', authenticateJWT, requireSellerRole, async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// ADD a new category (global)
router.post('/seller/categories', authenticateJWT, requireSellerRole, async (req, res) => {
  const { name, description, is_active } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }
  try {
    await db.query(
      'INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)',
      [name, description || '', is_active !== undefined ? is_active : 1]
    );
    res.json({ success: true, message: 'Category added.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add category.' });
  }
});

// UPDATE a category (global)
router.put('/seller/categories/:id', authenticateJWT, requireSellerRole, async (req, res) => {
  const { name, description, is_active } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE categories SET name=?, description=?, is_active=? WHERE category_id=?',
      [name, description, is_active, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// DELETE a category (global)
router.delete('/seller/categories/:id', authenticateJWT, requireSellerRole, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM categories WHERE category_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

module.exports = router; 