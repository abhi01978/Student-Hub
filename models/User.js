const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Email unique hona chahiye
    password: { type: String, required: true },
    class: { type: String, required: true } // Ye check karo ye hai ya nahi
});

module.exports = mongoose.model('User', userSchema);