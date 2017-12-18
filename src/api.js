require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const debug = require('debug');
const multer  = require('multer');

const lDebug = debug('dTorrent:api:debug');
let app = null;

/**
 * Initialize API
 */
module.exports = async(staticList, _express) => {

	if(_express !== null) {
		app = _express;
	} else {
		app = express();
	}

	/**
	 * Allow Cros origin
	 */
	app.use((req, res, next) => {
		const allowedOrigins = ['http://localhost:3000'];
		const {origin} = req.headers;
		if(allowedOrigins.indexOf(origin) > -1){
			res.setHeader('Access-Control-Allow-Origin', origin);
		}
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.setHeader('Access-Control-Allow-Credentials', true);

		next();
	});

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	const upload = multer({dest: `${__dirname}/api/uploads/`});
	const completeUpload = upload.fields([
		{ name: 'torrent', maxCount: 1 },
		{ name: 'file', maxCount: 1 }
	]);
	const fileUpload = upload.fields([
		{ name: 'file', maxCount: 1 }
	]);

	const controller = require('./api/controllers/torrent');
	controller.init(staticList);
	const controllerWebSocket = require('./api/controllers/web-socket');
	controllerWebSocket.init(staticList);

	app.get('/listener', controllerWebSocket.listener);

	app.put('/api/torrents', (req, res) => {
		controller.put(req, res, completeUpload);
	});

	app.post('/api/torrents', (req, res) => {
		controller.post(req, res, fileUpload);
	});

	app.delete('/api/torrents/:hash', controller.delete);
	app.get('/api/torrents', controller.getAll);
	app.get('/api/torrents/:hash', controller.getOne);

	app.get('/api/torrents/:hash/pause', controller.pause);
	app.get('/api/torrents/:hash/resume', controller.resume);


	lDebug(`API started on ${process.env.API_PORT}`);

	if(_express === null) {
		app.listen(process.env.API_PORT);
	}
};

/**
 *
 * PUT /api/torrent (fichier .torrent)
 * POST /api/torrent (fichier à torrentifier + datas)
 * DELETE /api/torrent
 * GET one /api/torrents/:hash
 * GET all /api/torrents
 */