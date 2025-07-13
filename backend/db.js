const oracledb = require('oracledb');
console.log("oracledb")
require('dotenv').config();

oracledb.initOracleClient();

const poolPromise = oracledb.createPool({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
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
