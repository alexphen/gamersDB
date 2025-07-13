const oracledb = require('oracledb');
require('dotenv').config();

oracledb.initOracleClient();

const poolPromise = oracledb.createPool({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
});

module.exports = {
  getConnection: async () => {
    await poolPromise;
    return oracledb.getConnection();
  }
};
