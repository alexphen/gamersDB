require('dotenv').config();
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function withConnection(callback) {
  let conn;
  try {
    conn = await oracledb.getConnection({
        user: 'ADMIN',
        password: 'loonSQLpassword2',
        connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_medium.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",

        configDir: "/wallet"
    });
    return await callback(conn);
  } finally {
    if (conn) await conn.close();
  }
}

async function getGames() {
  return withConnection(async (conn) => {
    const result = await conn.execute(`
      SELECT game, players, CAST(gamers AS gamer_names_type) AS gamers FROM games
    `);
    return result.rows.map(row => ({
      id: row.GAME, // use game name as ID
      game: row.GAME,
      players: row.PLAYERS,
      gamers: row.GAMERS || []
    }));
  });
}

async function addGame(game) {
  return withConnection(async (conn) => {
    const gamerArray = game.gamers || [];
    const bindVars = {
      game: game.game,
      players: game.players,
      gamers: { type: 'GAMER_NAMES_TYPE', val: gamerArray }
    };

    await conn.execute(`
      INSERT INTO games (game, players, gamers)
      VALUES (:game, :players, :gamers)
    `, bindVars);

    await conn.commit();
    return { id: game.game, ...game };
  });
}

async function deleteGame(id) {
  return withConnection(async (conn) => {
    const result = await conn.execute(`
      DELETE FROM games WHERE game = :id
    `, { id });
    await conn.commit();
    return result.rowsAffected > 0;
  });
}

async function updateGame(id, { addGamer, removeGamer }) {
  return withConnection(async (conn) => {
    const result = await conn.execute(`
      SELECT CAST(gamers AS gamer_names_type) AS gamers FROM games WHERE game = :id
    `, { id });

    if (result.rows.length === 0) return null;

    let gamers = result.rows[0].GAMERS || [];

    if (addGamer && !gamers.includes(addGamer)) {
      gamers.push(addGamer);
    }

    if (removeGamer) {
      gamers = gamers.filter(g => g !== removeGamer);
    }

    await conn.execute(`
      UPDATE games SET gamers = :gamers WHERE game = :id
    `, {
      id,
      gamers: { type: 'GAMER_NAMES_TYPE', val: gamers }
    });

    await conn.commit();
    return { id, game: id, players: null, gamers }; // players: null for now, or refetch
  });
}

module.exports = { getGames, addGame, deleteGame, updateGame };
