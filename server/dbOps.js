const oracledb = require('oracledb');

/**
 * Database operations for the games application
 */
class DbOps {
    
   /**
     * Helper function to convert Oracle nested table to JavaScript array
     * @param {*} gamersNestedTable - Oracle nested table result
     * @returns {Array<string>} Array of gamer names
     */
    static parseGamersArray(gamersNestedTable) {
        if (!gamersNestedTable || gamersNestedTable.length === 0) {
            return [];
        }
        
        // Handle Oracle nested table structure
        if (Array.isArray(gamersNestedTable)) {
            return gamersNestedTable.map(gamer => {
                // Oracle nested tables might return objects with COLUMN_VALUE property
                if (typeof gamer === 'object' && gamer.COLUMN_VALUE) {
                    return gamer.COLUMN_VALUE.trim();
                }
                return typeof gamer === 'string' ? gamer.trim() : String(gamer).trim();
            }).filter(gamer => gamer);
        }
        
        return [];
    }

    /**
     * Fetch all games from the database
     * @returns {Promise<Array>} Array of game objects
     */
    static async getAllGames() {
        const conn = await oracledb.getConnection();
        try {
            const result = await conn.execute(
                `SELECT rowid, game, players, gamers from GAMES`,
                [],
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT
                    // Remove the fetchInfo configuration - let Oracle handle the nested table naturally
                }
            );
            
            return result.rows.map(row => ({
                rowid: row.ROWID,
                game: row.GAME,
                players: row.PLAYERS,
                gamer_list: this.parseGamersArray(row.GAMERS)
            }));
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
            const gamerArray = gamers.split(',').map(name => name.trim());
            
            // Build the SQL with the exact number of literal values
            const gamerValues = gamerArray.map(gamer => `'${gamer.replace(/'/g, "''")}'`).join(', ');
            console.log(gamerValues)
            
            await conn.execute(
            `INSERT INTO games (game, players, gamers) 
            VALUES (:game, :players, gamer_names_type(${gamerValues}))`,
            { game: game, players: players },
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
      await conn.execute(
        `INSERT INTO TABLE(
            SELECT g.gamers FROM games g WHERE rowid = :id
        ) VALUES (:gamer_name)`,
        [id, gamerName],
        { autoCommit: true }
        // `UPDATE games SET gamers = COALESCE(gamers, '') || ',' || :gamer_name WHERE rowid = :id`,
        // [gamerName, id],
        // { autoCommit: true }
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
        await conn.execute(
            `UPDATE games 
            SET gamers = gamers MULTISET EXCEPT gamer_names_type(:gamerName),
                players = GREATEST(players - 1, 0)
            WHERE ROWID = :gameRowId`,
            { gameRowId: id, gamerName: gamerName },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
  }

    /**
     * Get games that all specified players own
     * @param {Array<string>} playersArray - Array of player names
     * @returns {Promise<Array>} Array of games that all players own
     */
    async getPlayableGames(playersArray) {
        let connection;
        try {
            if (!playersArray || playersArray.length === 0) {
            throw new Error('At least one player must be specified');
            }

            connection = await this.getConnection();
            
            // Build dynamic SQL to check if all players own each game
            const placeholders = playersArray.map((_, index) => `:player${index + 1}`).join(', ');
            const binds = {};
            playersArray.forEach((player, index) => {
            binds[`player${index + 1}`] = player;
            });

            const query = `
            SELECT ROWID, game, players, gamers
            FROM games g
            WHERE (
                SELECT COUNT(*)
                FROM TABLE(g.gamers) t
                WHERE t.COLUMN_VALUE IN (${placeholders})
            ) = :playerCount
            AND players >= :playerCount
            ORDER BY game
            `;

            binds.playerCount = playersArray.length;

            const result = await connection.execute(query, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo: {
                "GAMERS": { type: oracledb.DB_TYPE_VARCHAR }
            }
            });

            return result.rows.map(row => ({
                rowid: row.ROWID,
                game: row.GAME,
                players: row.PLAYERS,
                gamer_list: this.parseGamersArray(row.GAMERS)
            }));

        } catch (err) {
            console.error('Error in getPlayableGames:', err);
            throw new Error('Failed to fetch playable games: ' + err.message);
        } finally {
            if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection in getPlayableGames:', err);
            }
            }
        }
    }
}

module.exports = DbOps;