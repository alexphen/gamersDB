const express = require('express');
const bodyParser = require('body-parser');
const { initializePool } = require('./db');
const DbOps = require('./dbOps');
const cors = require('cors');
const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

const port = process.env.PORT || 3001;

const dbConfig = {
	user: 'ADMIN',
	password: process.env.ORACLE_PASSWORD,
	connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_medium.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",

	configDir: "/wallet"
};

// OracleDB Initialization
async function init() {
    try {
		await oracledb.createPool({
			user: 'ADMIN',
			password: process.env.ORACLE_PASSWORD,
			connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g1e4482f6c79339_gamersdb_medium.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))",
		});

    let connection;
    try {
      // get connection from the pool and use it
      connection = await oracledb.getConnection(dbConfig);
      console.log("Successfully connected")
    } catch (err) {
        console.log("err1");
        throw (err);
    } finally {
        if (connection) {
            try {
                await connection.close(); // Put the connection back in the pool
            } catch (err) {
            console.log("err2");
                throw (err);
            }
        } else {
            console.log("no connection")
        }
    }

    } catch (err) {
        console.log(err.message);
    }
    
    
    app.listen(port, () => console.log(`Listening on port ${port}`));
}

init();

// Fetch all games
app.get('/api/games/all', async (req, res) => {
  try {
    console.log("Called all", req.body);
    const items = await DbOps.getAllGames();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a game
app.post('/api/games/all', async (req, res) => {
  try {
    console.log("Called add game", req.body);
    const { game, players, gamers, fullPartyOnly, remotePlay } = req.body;
    await DbOps.addGame(game, players, gamers, fullPartyOnly, remotePlay);
    res.status(201).json({ message: 'Game added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a game
app.put('/api/games/game/:id', async (req, res) => {
  try {
    console.log("Called update game", req.body);
    const { id } = req.params;
    const updates = req.body;
    await DbOps.updateGame(id, updates);
    res.json({ message: 'Game updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete game by ROWID
app.delete('/api/games/game/:id', async (req, res) => {
  try {
    console.log("Called delete", req.body);
    const { id } = req.params;
    await DbOps.deleteGame(id);
    res.json({ message: 'Game deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add gamer
app.post('/api/games/game/:id/gamers', async (req, res) => {
  try {
    console.log("Called add gamer", req.body);
    const { id } = req.params;
    const { gamer_name } = req.body;
    await DbOps.addGamer(id, gamer_name);
    res.json({ message: 'Gamer added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove gamer
app.delete('/api/games/game/:id/gamers', async (req, res) => {
  try {
    console.log("Called remove gamer", req.body);
    const { id } = req.params;
    const { gamer_name } = req.body;
    await DbOps.removeGamer(id, gamer_name);
    res.json({ message: 'Gamer removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get playable games
app.get('/api/games/playable', async (req, res) => {
  try {
		const { players } = req.query;
		const playerList = players?.split(',').map(p => p.trim());
		console.log("Called playable", playerList);
		const items = await DbOps.getPlayableGames(playerList);
		res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all unique gamers
app.get('/api/games/gamers', async (req, res) => {
  try {
    console.log("Called get all gamers");
    const gamers = await DbOps.getAllGamers();
    res.json({ gamers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get games by gamer
app.get('/api/games/gamer/:gamerName', async (req, res) => {
  try {
    const { gamerName } = req.params;
    console.log("Called get games by gamer", gamerName);
    const items = await DbOps.getGamesByGamer(gamerName);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});