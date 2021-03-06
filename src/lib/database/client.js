import SqlQueryLoader from './sql-query-loader';
import pool from './pool';
import Transaction from './transaction';

export default (appOrigin) => {
	const app = appOrigin;

	app.locals.pool = pool;
	app.locals.createTransaction = () => new Transaction();
	app.locals.fsSql = new SqlQueryLoader({
		path: 'src/lib/database/sqls'
	});
};
