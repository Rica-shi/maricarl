const express = require('express');
const router = express.Router();
const db = require('../db');  // use the db.js file you made

router.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS current_time');
    res.json({
      success: true,
      time: rows[0].current_time
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// GET /products/featured - fetch up to 3 active products with category and stock info
router.get('/products/featured', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.item_id, 
        i.name, 
        i.description, 
        i.sku, 
        i.sell_price, 
        i.image, 
        i.status, 
        i.created_at,
        c.name as category_name,
        COALESCE(s.quantity, 0) as stock_quantity,
        u.name as seller_name
      FROM item i
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN stock s ON i.item_id = s.item_id
      LEFT JOIN users u ON i.seller_id = u.id
      WHERE i.status = "active" 
      ORDER BY i.created_at DESC
      LIMIT 3
    `);
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch featured products' });
  }
});

// GET /products - list all products with category and stock info
router.get('/products', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.item_id, 
        i.name, 
        i.description, 
        i.sku, 
        i.sell_price, 
        i.image, 
        i.status, 
        i.created_at,
        i.category_id,
        c.name as category_name,
        COALESCE(s.quantity, 0) as stock_quantity,
        u.name as seller_name
      FROM item i
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN stock s ON i.item_id = s.item_id
      LEFT JOIN users u ON i.seller_id = u.id
      ORDER BY i.created_at DESC
    `);
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /products/categories - get all categories
router.get('/products/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories WHERE is_active = 1');
    res.json({ success: true, categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// GET /products/category/:categoryId - get products by category
router.get('/products/category/:categoryId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        i.item_id, 
        i.name, 
        i.description, 
        i.sku, 
        i.sell_price, 
        i.image, 
        i.status, 
        i.created_at,
        i.category_id,
        c.name as category_name,
        COALESCE(s.quantity, 0) as stock_quantity,
        u.name as seller_name
      FROM item i
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN stock s ON i.item_id = s.item_id
      LEFT JOIN users u ON i.seller_id = u.id
      WHERE i.category_id = ? AND i.status = "active"
      ORDER BY i.created_at DESC
    `, [req.params.categoryId]);
    res.json({ success: true, products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch products by category' });
  }
});

// GET /products/:id - get one product with category, stock, sold count, and seller profile image
router.get('/products/:id', async (req, res) => {
  try {
    // Get product, category, stock, seller name, and seller profile image
    const [rows] = await db.query(`
      SELECT 
        i.item_id, 
        i.name, 
        i.description, 
        i.sku, 
        i.sell_price, 
        i.image, 
        i.status, 
        i.created_at,
        i.category_id,
        c.name as category_name,
        COALESCE(s.quantity, 0) as stock_quantity,
        u.name as seller_name,
        u.profile_image as seller_profile_image
      FROM item i
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN stock s ON i.item_id = s.item_id
      LEFT JOIN users u ON i.seller_id = u.id
      WHERE i.item_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Product not found' });
    const product = rows[0];
    // Get sold count
    const [soldRows] = await db.query('SELECT SUM(quantity) as sold_count FROM orderline WHERE item_id = ?', [req.params.id]);
    product.sold_count = soldRows[0].sold_count || 0;
    // Placeholder for ratings (since no ratings table)
    product.rating = 5.0;
    product.ratings_count = 0;
    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// POST /products - create product (fixed to match current database schema)
router.post('/products', async (req, res) => {
  try {
    const { category_id, name, description, sku, sell_price, image, status, seller_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO item (category_id, name, description, sku, sell_price, image, status, seller_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [category_id, name, description, sku, sell_price, image, status || 'active', seller_id]
    );
    
    // Create stock entry for the new product
    await db.query('INSERT INTO stock (item_id, quantity) VALUES (?, 0)', [result.insertId]);
    
    res.status(201).json({ success: true, product_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// PUT /products/:id - update product (fixed to match current database schema)
router.put('/products/:id', async (req, res) => {
  try {
    const { category_id, name, description, sku, sell_price, image, status, seller_id } = req.body;
    const [result] = await db.query(
      'UPDATE item SET category_id=?, name=?, description=?, sku=?, sell_price=?, image=?, status=?, seller_id=? WHERE item_id=?',
      [category_id, name, description, sku, sell_price, image, status, seller_id, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// PUT /products/:id/stock - update product stock
router.put('/products/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const [result] = await db.query(
      'UPDATE stock SET quantity = ? WHERE item_id = ?',
      [quantity, req.params.id]
    );
    if (result.affectedRows === 0) {
      // If no stock record exists, create one
      await db.query('INSERT INTO stock (item_id, quantity) VALUES (?, ?)', [req.params.id, quantity]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update stock' });
  }
});

// DELETE /products/:id - delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM item WHERE item_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

module.exports = router;
