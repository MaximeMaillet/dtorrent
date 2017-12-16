require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const debug = require('debug');
const multer  = require('multer');

const lDebug = debug('dTorrent:api:debug');

/**
 * Initialize API
 */
module.exports = async(listener) => {
	lDebug('Launch API');
	const app = express();
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	const upload = multer({dest: `${__dirname}/src/api/uploads/`});
	const completeUpload = upload.fields([
		{ name: 'torrent', maxCount: 1 },
		{ name: 'file', maxCount: 1 }
	]);
	const fileUpload = upload.fields([
		{ name: 'file', maxCount: 1 }
	]);

	const controller = require('./src/api/controllers/torrent');
	controller.init(listener);

	app.put('/api/torrents', (req, res) => {
		controller.put(req, res, completeUpload);
	});

	app.post('/api/torrents', (req, res) => {
		controller.post(req, res, fileUpload);
	});

	app.delete('/api/torrents/:hash', controller.delete);
	app.get('/api/torrents/:hash', controller.getOne);
	app.get('/api/torrents', controller.getAll);


	lDebug(`API started on ${process.env.API_PORT}`);
	app.listen(process.env.API_PORT);
};

/**
 *
 * PUT /api/torrent (fichier .torrent)
 * POST /api/torrent (fichier à torrentifier + datas)
 * DELETE /api/torrent
 * GET one /api/torrents/:hash
 * GET all /api/torrents
 */