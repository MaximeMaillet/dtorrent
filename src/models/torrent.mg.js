const {Schema} = require('mongoose');

module.exports = new Schema({
	hash: { type: String, index: true },
	name: String,
	progress: Number,
	down_rate: Number,
	mb_downloaded: Number,
	mb_uploaded: Number,
	mb_total: Number,
	ratio: Number,
	nb_leechers: Number,
	nb_seeders: Number,
	playing: Boolean,
	is_finished: Boolean,
	is_active: Boolean,
	is_removed: Boolean,
});