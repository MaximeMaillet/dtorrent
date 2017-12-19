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

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());

	const {completeUpload, fileUpload} = enableMulter();
	enableApi(staticList, completeUpload, fileUpload);
	lDebug(`API started on ${process.env.API_PORT}`);

	if(process.env.API_WEBSOCKET) {
		enableWebSocket(staticList);
		lDebug(`Web socket started on ${process.env.API_PORT}`);
	}

	if(_express === null) {
		app.listen(process.env.API_PORT);
	}
};

function enableMulter() {
	const upload = multer({dest: `${__dirname}/../../public/uploads/`});
	const completeUpload = upload.fields([
		{ name: 'torrent', maxCount: 1 },
		{ name: 'file', maxCount: 1 }
	]);
	const fileUpload = upload.fields([
		{ name: 'file', maxCount: 1 }
	]);
	return {
		completeUpload,
		fileUpload
	};
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
function enableApi(staticList, completeUpload, fileUpload) {
	const controller = require('./controllers/torrent');
	controller.init(staticList);

	app.put('/api/torrents', (req, res) => {
		controller.put(req, res, completeUpload);
	});
	app.post('/api/torrents', (req, res) => {
		controller.post(req, res, fileUpload);
	});
	app.get('/api/torrents', controller.getAll);
	app.get('/api/torrents/:hash', controller.getOne);
	app.put('/api/torrents/:hash/pause', controller.pause);
	app.put('/api/torrents/:hash/resume', controller.resume);
	app.delete('/api/torrents/:hash', controller.delete);
}