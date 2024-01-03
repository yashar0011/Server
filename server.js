require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { User, Cart, Book, Address } = require('./models/user');

const app = express();
app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'Yashar', (err, user) => {
        if (err) {
            console.error("Token verification error:", err); s
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// MongoDB connection URI
const mongoURI = 'mongodb+srv://yghasempour1:TZVYLONotf7GdjWz@yasharcluster.ygwlgkp.mongodb.net/?retryWrites=true&w=majority'; // Replace with your actual URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));


// Registration endpoint
app.post('/register', async (req, res) => {
    try {
        // Check if the user already exists
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return res.status(400).send('User already exists');
        }
        console.log('hi');
        //Hashing
        const { password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
        });

        // Save the user in the database
        await user.save();

        // Respond with the registered user (excluding the password)
        res.status(201).json({ username: user.username, email: user.email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        if (!user) {
            return res.status(400).send('Invalid username');
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid password');
        }

        const token = jwt.sign({ userId: user._id }, 'Yashar', { expiresIn: '10h' });

        res.json({ token, userId: user._id, username: user.username });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Add To Cart Endpoint
app.post('/add-to-cart', authenticateToken, async (req, res) => {
    const { bookName, quantity, coverImg } = req.body;
    const userId = req.user.userId;

    if (!bookName || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).send('Invalid request data');
    }

    try {
        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            cart = new Cart({ userId: userId, items: [] });
        }
        const cartItemIndex = cart.items.findIndex(item => item.bookName === bookName);
        if (cartItemIndex !== -1) {
            cart.items[cartItemIndex].quantity += quantity;
            cart.items[cartItemIndex].coverImg = coverImg;
        } else {
            cart.items.push({ bookName, quantity, coverImg });
        }

        await cart.save();
        res.status(200).json(cart.items);

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


//Remove from the cart end point
app.post('/remove-from-cart', authenticateToken, async (req, res) => {
    const { userId, bookId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        user.cart = user.cart.filter(item => item.bookId.toString() !== bookId);
        await user.save();

        res.status(200).json(user.cart);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

//Get cart Endpoint
app.get('/cart', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            cart = new Cart({ userId: userId, items: [] });
        }
        res.status(200).json(cart.items);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// User details endpoint
app.get('/api/user/details', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).send('User not found');
        }

        // Send user details back to the client
        res.json(userDetails);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Update the quantity of an item in the cart
app.patch('/cart/update-quantity', authenticateToken, async (req, res) => {
    const { bookName, quantity } = req.body;
    const userId = req.user.userId;

    if (!bookName || quantity === undefined) {
        return res.status(400).send('Book name and quantity are required.');
    }

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).send('Cart not found.');
        }

        const item = cart.items.find(item => item.bookName === bookName);
        if (item) {
            item.quantity = quantity;
            if (item.quantity <= 0) {
                cart.items = cart.items.filter(item => item.bookName !== bookName);
            }
        } else {
            return res.status(404).send('Item not found in cart.');
        }

        await cart.save();
        res.status(200).json(cart.items);
    } catch (error) {
        res.status(500).send('Server error.');
    }
});

// Remove an item from the cart
app.delete('/cart/remove-item', authenticateToken, async (req, res) => {
    const { bookName } = req.body;
    const userId = req.user.userId;

    if (!bookName) {
        return res.status(400).send('Book name is required.');
    }

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).send('Cart not found.');
        }

        cart.items = cart.items.filter(item => item.bookName !== bookName);

        await cart.save();
        res.status(200).json(cart.items);
    } catch (error) {
        res.status(500).send('Server error.');
    }
});

//updating the quantity of items in the user's cart and removing items when their quantity reaches zero
app.patch('/cart/item', authenticateToken, async (req, res) => {
    const { bookName, quantity } = req.body;
    const userId = req.user.userId;

    if (!bookName || quantity === undefined) {
        return res.status(400).json({ message: 'Book name and quantity are required.' });
    }

    if (quantity < 0) {
        return res.status(400).json({ message: 'Quantity cannot be negative.' });
    }

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        const itemIndex = cart.items.findIndex(item => item.bookName === bookName);

        if (itemIndex > -1) {
            if (quantity > 0) {
                cart.items[itemIndex].quantity = quantity;
            } else {
                cart.items.splice(itemIndex, 1);
            }
        } else if (quantity > 0) {
            cart.items.push({ bookName, quantity });
        }

        await cart.save();
        res.status(200).json({ message: 'Cart updated.', cart: cart.items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

app.post('/add-address', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { address } = req.body;

        const newAddress = new Address({ userId, address });
        await newAddress.save();
        res.status(201).send('Address saved successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));