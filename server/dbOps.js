const oracledb = require('oracledb');

/**
 * Database operations for the games application
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
        `SELECT rowid, game, players, gamers FROM games`
      );
      
      const items = result.rows.map(row => ({
        rowid: row[0],
        game: row[1],
        players: row[2],
        gamer_list: row[3]
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
   * Get games that are playable by a specific group of players
   * @param {Array<string>} playerList - Array of player names
   * @returns {Promise<Array>} Array of playable game objects
   */
  static async getPlayableGames(playerList) {
    const conn = await oracledb.getConnection();
    try {
        const result = await conn.execute(
            `SELECT rowid, game, players, gamers FROM games`
        );
        console.log(result)
        result = await conn.execute(
            `SELECT rowid, game, players, 
                    (SELECT LISTAGG(COLUMN_VALUE, ',') WITHIN GROUP (ORDER BY COLUMN_VALUE)
                    FROM TABLE(gamers)) as gamer_list
            FROM games`
        );
        console.log(result)
        
        const items = result.rows.map(row => {
            const owners = row[3]?.split(',').map(g => g.trim()) || [];
            const ownersInGroup = owners.filter(owner => playerList.includes(owner));
            return {
                rowid: row[0],
                game: row[1],
                players: row[2],
                gamer_list: row[3],
                owners_in_group: ownersInGroup.join(',')
            };
        }).filter(g => g.owners_in_group && g.players >= playerList.length);

        return items;
    } finally {
      await conn.close();
    }
  }
}

module.exports = DbOps;