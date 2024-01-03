const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { versionKey: false });

// CartItem Schema
const cartItemSchema = new mongoose.Schema({
    bookName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1.'],
        default: 1
    },
    coverImg: {
        type: String,
        required: false
    }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema]
});

const bookSchema = new mongoose.Schema({
    name: String,
});

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    address: {
        type: String,
        required: true
    }
});

module.exports = {
    User: mongoose.model('User', userSchema),
    CartItem: mongoose.model('CartItem', cartItemSchema),
    Cart: mongoose.model('Cart', cartSchema),
    Book: mongoose.model('Book', bookSchema),
    Address: mongoose.model('Address', addressSchema)
};
