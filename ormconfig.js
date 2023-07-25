module.exports = {
  type: 'mysql',
  host: 'MYSQL5048.site4now.net',
  port: 3306,
  username: 'a7f37d_rubios',
  password: 'Abcd1234',
  database: 'db_a7f37d_rubios',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
 // migrations: ['dist/migrations/*.js'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};
