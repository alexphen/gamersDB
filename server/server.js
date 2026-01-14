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

// OracleDB Initialization
async function init() {
    try {
      await oracledb.createPool({
        user: 'ADMIN',
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
      });

      let connection;
      try {
        // get connection from the pool and use it
        connection = await oracledb.getConnection();
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
    const { game, players, gamers } = req.body;
    await DbOps.addGame(game, players, gamers);
    res.status(201).json({ message: 'Game added' });
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