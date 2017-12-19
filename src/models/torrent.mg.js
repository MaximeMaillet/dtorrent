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
	is_active: Boolean,
	is_filled: Boolean,
	is_removed: Boolean,
	is_finished: Boolean,
	nb_leechers: Number,
	nb_seeders: Number,
});