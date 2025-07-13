const oracledb = require('oracledb');
require('dotenv').config();


async function initializePool() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
      poolAlias: 'default', // This creates the "default" pool
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('Pool created successfully');
  } catch (error) {
    console.error('Pool creation failed:', error);
    throw error;
  }
}
// const poolPromise = oracledb.createPool({
//   user: process.env.ORACLE_USER,
//   password: process.env.ORACLE_PASSWORD,
//   connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
//   poolMin: 2,
//   poolMax: 10,
//   poolIncrement: 1
// });

module.exports = {
  initializePool,
  // getConnection: async () => {
  //   await poolPromise;
  //   return oracledb.getConnection();
  // }
};
