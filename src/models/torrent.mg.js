const {Schema} = require('mongoose');

module.exports = new Schema({
	hash: { type: String, index: true },
	name: String,
	progress: Number,
	down_rate: Number,
	mb_downloaded: Number,
	mb_uploaded: Number,
	mb_total: Number,
	playing: Boolean,
	isDone: Boolean,
	ratio: Number,
	is_filled: Boolean,
	is_finished: Boolean
});