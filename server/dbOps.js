const oracledb = require('oracledb');

/**
 * Database operations for the games application
 * Updated to use comma-separated string for gamers instead of nested table
 */
class DbOps {
    
    /**
     * Fetch all games from the database
     * @returns {Promise<Array>} Array of game objects
     */
    static async getAllGames() {
        const conn = await oracledb.getConnection();
        try {
            const result = await conn.execute(
                `SELECT rowid, game, players, gamers FROM GAMES ORDER BY game`
            );
            
            const items = result.rows.map(row => ({
                rowid: row[0],
                game: row[1],
                players: row[2],
                gamer_list: row[3] ? row[3].split(',').map(g => g.trim()).filter(g => g) : []
            }));

            return items;
        } finally {
            await conn.close();
        }
    }

    /**
     * Add a new game to the database
     * @param {string} game - Game name
     * @param {number} players - Number of players
     * @param {string} gamers - Comma-separated list of gamers
     * @returns {Promise<void>}
     */
    static async addGame(game, players, gamers) {
        const conn = await oracledb.getConnection();
        try {
            // Clean up the gamers string - remove extra spaces and ensure proper formatting
            const cleanGamers = gamers.split(',')
                .map(name => name.trim())
                .filter(name => name)
                .join(', ');
            
            await conn.execute(
                `INSERT INTO games (game, players, gamers) VALUES (:game, :players, :gamers)`,
                { 
                    game: game, 
                    players: players, 
                    gamers: cleanGamers 
                },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * Delete a game by ROWID
     * @param {string} id - ROWID of the game to delete
     * @returns {Promise<void>}
     */
    static async deleteGame(id) {
        const conn = await oracledb.getConnection();
        try {
            await conn.execute(
                `DELETE FROM games WHERE rowid = :id`,
                [id],
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * Add a gamer to a specific game
     * @param {string} id - ROWID of the game
     * @param {string} gamerName - Name of the gamer to add
     * @returns {Promise<void>}
     */
    static async addGamer(id, gamerName) {
        const conn = await oracledb.getConnection();
        try {
            // First get the current gamers list
            const result = await conn.execute(
                `SELECT gamers FROM games WHERE rowid = :id`,
                [id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Game not found');
            }
            
            const currentGamers = result.rows[0][0] || '';
            const gamersList = currentGamers ? currentGamers.split(',').map(g => g.trim()) : [];
            
            // Check if gamer already exists
            const trimmedGamerName = gamerName.trim();
            if (gamersList.includes(trimmedGamerName)) {
                throw new Error('Gamer already exists in this game');
            }
            
            // Add the new gamer
            gamersList.push(trimmedGamerName);
            const updatedGamers = gamersList.join(', ');
            
            await conn.execute(
                `UPDATE games SET gamers = :gamers WHERE rowid = :id`,
                { gamers: updatedGamers, id: id },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * Remove a gamer from a specific game
     * @param {string} id - ROWID of the game
     * @param {string} gamerName - Name of the gamer to remove
     * @returns {Promise<void>}
     */
    static async removeGamer(id, gamerName) {
        const conn = await oracledb.getConnection();
        try {
            // First get the current gamers list
            const result = await conn.execute(
                `SELECT gamers, players FROM games WHERE rowid = :id`,
                [id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Game not found');
            }
            
            const currentGamers = result.rows[0][0] || '';
            const currentPlayers = result.rows[0][1];
            const gamersList = currentGamers ? currentGamers.split(',').map(g => g.trim()) : [];
            
            // Remove the gamer
            const trimmedGamerName = gamerName.trim();
            const filteredGamers = gamersList.filter(g => g !== trimmedGamerName);
            
            // Update the gamers list and potentially reduce player count
            const updatedGamers = filteredGamers.join(', ');
            const updatedPlayers = Math.max(currentPlayers - 1, 0);
            
            await conn.execute(
                `UPDATE games 
                 SET gamers = :gamers, players = :players 
                 WHERE rowid = :id`,
                { 
                    gamers: updatedGamers, 
                    players: updatedPlayers, 
                    id: id 
                },
                { autoCommit: true }
            );
        } finally {
            await conn.close();
        }
    }

    /**
     * Get games that are playable by a specific group of players
     * @param {Array<string>} playerList - Array of player names
     * @returns {Promise<Array>} Array of playable game objects
     */
    static async getPlayableGames(playerList) {
        const conn = await oracledb.getConnection();
        try {
            const result = await conn.execute(
                `SELECT rowid, game, players, gamers FROM games ORDER BY game`
            );
            
            const items = result.rows.map(row => {
                const gameOwners = row[3] ? row[3].split(',').map(g => g.trim()).filter(g => g) : [];
                
                return {
                    rowid: row[0],
                    game: row[1],
                    players: row[2],
                    gamer_list: gameOwners
                };
            }).filter(game => {
                // Check if the game can accommodate the number of players
                if (game.players < playerList.length) {
                    return false;
                }
                
                // Check if ALL players in playerList own this game
                const allPlayersOwnGame = playerList.every(player => 
                    game.gamer_list.includes(player.trim())
                );
                
                return allPlayersOwnGame;
            });

            console.log('Filtered items:', items);
            return items;
        } finally {
            await conn.close();
        }
    }

    /**
     * Get games by a specific gamer
     * @param {string} gamerName - Name of the gamer
     * @returns {Promise<Array>} Array of game objects owned by the gamer
     */
    static async getGamesByGamer(gamerName) {
        const conn = await oracledb.getConnection();
        try {
            const result = await conn.execute(
                `SELECT rowid, game, players, gamers 
                 FROM games 
                 WHERE UPPER(gamers) LIKE UPPER(:gamerPattern)
                 ORDER BY game`,
                { gamerPattern: `%${gamerName}%` }
            );
            
            const items = result.rows.map(row => ({
                rowid: row[0],
                game: row[1],
                players: row[2],
                gamer_list: row[3] ? row[3].split(',').map(g => g.trim()).filter(g => g) : []
            })).filter(game => {
                // Double-check that the gamer actually owns this game (not just a partial match)
                return game.gamer_list.some(gamer => 
                    gamer.toLowerCase() === gamerName.toLowerCase()
                );
            });

            return items;
        } finally {
            await conn.close();
        }
    }

    /**
     * Get all unique gamers from the database
     * @returns {Promise<Array>} Array of unique gamer names
     */
    static async getAllGamers() {
        const conn = await oracledb.getConnection();
        try {
            const result = await conn.execute(
                `SELECT DISTINCT gamers FROM games WHERE gamers IS NOT NULL`
            );
            
            const allGamers = new Set();
            result.rows.forEach(row => {
                if (row[0]) {
                    const gamers = row[0].split(',').map(g => g.trim()).filter(g => g);
                    gamers.forEach(gamer => allGamers.add(gamer));
                }
            });
            
            return Array.from(allGamers).sort();
        } finally {
            await conn.close();
        }
    }

    /**
     * Update a game's details
     * @param {string} id - ROWID of the game
     * @param {Object} updates - Object containing fields to update
     * @returns {Promise<void>}
     */
    static async updateGame(id, updates) {
        const conn = await oracledb.getConnection();
        try {
            const setParts = [];
            const params = { id: id };
            
            if (updates.game) {
                setParts.push('game = :game');
                params.game = updates.game;
            }
            
            if (updates.players !== undefined) {
                setParts.push('players = :players');
                params.players = updates.players;
            }
            
            if (updates.gamers !== undefined) {
                setParts.push('gamers = :gamers');
                // Clean up the gamers string
                params.gamers = updates.gamers.split(',')
                    .map(name => name.trim())
                    .filter(name => name)
                    .join(', ');
            }
            
            if (setParts.length === 0) {
                throw new Error('No updates provided');
            }
            
            const sql = `UPDATE games SET ${setParts.join(', ')} WHERE rowid = :id`;
            
            await conn.execute(sql, params, { autoCommit: true });
        } finally {
            await conn.close();
        }
    }
}

module.exports = DbOps;