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
module.exports.enable = async(staticList, _express) => {

	if(_express !== null) {
		app = _express;
	} else {
		app = express();
	}

	app.use(bodyParser.urlencoded({
		limit: '500mb',
		extended: true,
		parameterLimit: 1000000
	}));
	app.use(bodyParser.json());

	const completeUpload = enableMulter();
	enableApi(staticList, completeUpload);

	if(process.env.API_WEBSOCKET) {
		enableWebSocket(staticList);
		lDebug(`Web socket started on ${process.env.APP_PORT}`);
	}

	if(_express === null) {
		app.listen(process.env.APP_PORT);
	}
	lDebug(`API dTorrent started on port : ${process.env.APP_PORT}`);
};

function enableMulter() {
	const upload = multer({dest: `${__dirname}/../../public/uploads/`});
	return upload.fields([
		{ name: 'torrent', maxCount: 1 },
		{ name: 'file', maxCount: 8 }
	]);
}

/**
 * Enable web socket
 * @param staticList
 */
function enableWebSocket(staticList) {
	const controllerWebSocket = require('./controllers/web-socket');
	controllerWebSocket.init(staticList);

	app.get('/listener', controllerWebSocket.listener);
}

/**
 * Enable API
 * @param staticList
 * @param completeUpload
 * @param fileUpload
 */
function enableApi(staticList, completeUpload) {
	const controller = require('./controllers/torrent');
	controller.init(staticList);

	app.post('/api/torrents', (req, res) => {
		controller.post(req, res, completeUpload);
	});
	app.get('/api/torrents', controller.getAll);
	app.get('/api/torrents/:hash', controller.getOne);
	app.put('/api/torrents/:hash/pause', controller.pause);
	app.put('/api/torrents/:hash/resume', controller.resume);
	app.delete('/api/torrents/:hash', controller.delete);
}