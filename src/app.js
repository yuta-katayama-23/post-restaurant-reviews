import 'source-map-support/register';
import express from 'express';
import * as helmet from 'helmet';
import appRoot from 'app-root-path';
import favicon from 'serve-favicon';
import moment from 'moment';
import config from 'config';
import Tokens from 'csrf';

import expressSession from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';

import router from './routes/index';
import shopsRouter from './routes/shops';
import searchRouter from './routes/search';
import accountRouter from './routes/account';

import { AppLogger } from './lib/logger/logger';
import applicationLogger from './lib/logger/application-logger';
import accessLogger from './lib/logger/access-logger';

import mysqlClient from './lib/database/client';
import { padding } from './lib/math/math';

const port = process.env.PORT || 3000;
const app = express();

app.set('view engine', 'ejs');
app.set('views', appRoot.resolve('src/views'));

const redis = new Redis();
const RedisStore = connectRedis(expressSession);
const store = new RedisStore({ client: redis });

app.use(
	expressSession({
		...config.get('redis.session'),
		secret: process.env.COOKIE_SECRET,
		store
	})
);

app.use(helmet.hidePoweredBy());
app.use(helmet.xssFilter());
app.use(
	helmet.contentSecurityPolicy({
		useDefaults: false,
		directives: {
			'default-src': ["'self'"],
			'base-uri': ["'self'"],
			// 'block-all-mixed-content': [], <- MDNによると非推奨なのでコメントアウト
			'font-src': ["'self'", 'https:', 'data:', 'https://use.fontawesome.com'], // <- fontを読み込めるように追記
			'form-action': ["'self'"],
			'frame-ancestors': ["'self'"],
			'frame-src': ['https://www.google.com/'],
			'img-src': ["'self'", 'data:'],
			'object-src': ["'none'"],
			'script-src': [
				"'self'",
				'https://cdn.jsdelivr.net/npm/',
				'https://www.google.com/',
				'https://www.gstatic.com/', // <- JSを読み込めるように追記
				"'unsafe-inline'", // <- inline scriptの有効化
				"'unsafe-eval'" // <- Vue.js用
			],
			'script-src-attr': ["'none'"],
			'style-src': [
				"'self'",
				'https:',
				"'unsafe-inline'",
				'https://cdn.jsdelivr.net',
				'https://use.fontawesome.com' // <- cssを読み込めるように追記
			]
			// 'upgrade-insecure-requests': [], <- HTTPでコンテンツ取得したいのでコメントアウト
		}
	})
);

mysqlClient(app);
app.locals.tokens = new Tokens();
app.use((req, res, next) => {
	res.locals.moment = moment;
	res.locals.padding = padding;
	next();
});

app.use(favicon(appRoot.resolve('src/public/favicon.ico')));
app.use('/public', express.static(appRoot.resolve('src/public')));

app.use(accessLogger());
app.use(express.urlencoded({ extended: true }));

app.use('/account', accountRouter);
app.use('/search', searchRouter);
app.use('/shops', shopsRouter);
app.use('/', router);

app.use(applicationLogger());

app.listen(port, () => {
	AppLogger.info(`Application listening at ${port}`);
});
