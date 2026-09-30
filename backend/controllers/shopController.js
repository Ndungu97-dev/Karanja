const sql = require("../config/db");

// Get all available academy courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await sql`SELECT * FROM courses ORDER BY id ASC`;
    res.status(200).json(courses);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Failed to load courses" });
  }
};

// Get user cart items
exports.getCart = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });

    const cart = await sql`
      SELECT c.id as cart_id, co.id as course_id, co.title, co.price, co.image_url, c.quantity
      FROM cart_items c
      JOIN courses co ON c.course_id = co.id
      WHERE c.user_id = ${req.session.user.id}
    `;
    res.status(200).json(cart);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Failed to load cart" });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: "Please log in first" });
    const { course_id } = req.body;
    const user_id = req.session.user.id;

    // Check if already in cart, update quantity or insert
    const existing = await sql`
      SELECT * FROM cart_items WHERE user_id = ${user_id} AND course_id = ${course_id}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE cart_items SET quantity = quantity + 1 
        WHERE user_id = ${user_id} AND course_id = ${course_id}
      `;
    } else {
      await sql`
        INSERT INTO cart_items (user_id, course_id, quantity) 
        VALUES (${user_id}, ${course_id}, 1)
      `;
    }

    res.status(200).json({ message: "Course added to cart successfully" });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { course_id } = req.params;

    await sql`
      DELETE FROM cart_items WHERE user_id = ${req.session.user.id} AND course_id = ${course_id}
    `;
    res.status(200).json({ message: "Item removed from cart" });
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({ error: "Failed to remove item" });
  }
};

// Checkout & Process Payment Simulation (M-Pesa / Card)
exports.checkout = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
    const { payment_method } = req.body;
    const user_id = req.session.user.id;

    // Fetch user cart items
    const cart = await sql`
      SELECT c.course_id, co.price, c.quantity
      FROM cart_items c
      JOIN courses co ON c.course_id = co.id
      WHERE c.user_id = ${user_id}
    `;

    if (cart.length === 0) return res.status(400).json({ error: "Your cart is empty" });

    // Calculate total amount
    const total_amount = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    // Record Order
    const [order] = await sql`
      INSERT INTO orders (user_id, total_amount, payment_method, status)
      VALUES (${user_id}, ${total_amount}, ${payment_method || 'M-Pesa'}, 'completed')
      RETURNING id, total_amount, created_at;
    `;

    // Clear Cart after successful checkout
    await sql`DELETE FROM cart_items WHERE user_id = ${user_id}`;

    res.status(200).json({
      message: "Checkout successful! Enrolled in courses.",
      order
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Payment processing failed" });
  }
};
