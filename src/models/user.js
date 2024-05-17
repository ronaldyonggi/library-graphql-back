const { default: mongoose } = require('mongoose');

const schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minLength: 5,
  },
  favoriteGenre: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('User', schema);
