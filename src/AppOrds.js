import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Trash2, UserPlus, UserMinus, Database, Eye, Filter, AlertCircle } from 'lucide-react';

const GamesDatabase = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGamer, setSearchGamer] = useState('');
  const [playersLookingToPlay, setPlayersLookingToPlay] = useState('');
  const [newGame, setNewGame] = useState({ game: '', players: '', gamers: '' });
  const [editingGame, setEditingGame] = useState(null);
  const [showPlayableGames, setShowPlayableGames] = useState(false);

  const ORDS_BASE_URL = "https://g1e4482f6c79339-gamersdb.adb.us-ashburn-1.oraclecloudapps.com/ords/admin/games/";

  // Apply game finder filter
  const applyGameFinder = async () => {
    if (playersLookingToPlay.trim()) {
      setShowPlayableGames(true);
      await fetchGames();
    }
  };

  // Clear game finder filter
  const clearGameFinder = () => {
    setShowPlayableGames(false);
    setPlayersLookingToPlay('');
    fetchGames();
  };
  // Fetch games from ORDS
  const fetchGames = async () => {
    try {
      setLoading(true);
      
     
      
      // Real ORDS integration - uncomment when ready
      const endpoint = showPlayableGames && playersLookingToPlay.trim() 
        ? `${ORDS_BASE_URL}/playable?players=${encodeURIComponent(playersLookingToPlay)}`
        : `${ORDS_BASE_URL}/all`;
        
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const data = await response.json();
      
      // Transform ORDS response to match our component structure
      const transformedGames = data.items.map(item => ({
        id: item.rowid,
        game: item.game,
        players: item.players,
        gamers: item.gamer_list ? item.gamer_list.split(',').map(g => g.trim()) : [],
        owners_in_group: item.owners_in_group ? item.owners_in_group.split(',').map(g => g.trim()) : []
      }));
      
      setGames(transformedGames);
      setError(null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load games on component mount
  useEffect(() => {
    fetchGames();
  }, []);

  // Add new game
  const addGame = async () => {
    if (newGame.game && newGame.players) {
      try {
        const response = await fetch(`${ORDS_BASE_URL}/all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            game: newGame.game,
            players: parseInt(newGame.players),
            gamers: newGame.gamers
          })
        });
        
        if (!response.ok) throw new Error('Failed to add game');
        
        setNewGame({ game: '', players: '', gamers: '' });
        fetchGames(); // Refresh the list
        
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Delete game
  const deleteGame = async (id) => {
    try {
      const response = await fetch(`${ORDS_BASE_URL}/game/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete game');
      
      fetchGames(); // Refresh the list

    } catch (err) {
      setError(err.message);
    }
  };

  // Add gamer to game
  const addGamerToGame = async (gameId, gamerName) => {
    if (gamerName.trim()) {
      try {
        const response = await fetch(`${ORDS_BASE_URL}/game/${gameId}/gamers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gamer_name: gamerName.trim()
          })
        });
        
        if (!response.ok) throw new Error('Failed to add gamer');
        
        fetchGames(); // Refresh the list
        
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Remove gamer from game
  const removeGamerFromGame = async (gameId, gamerName) => {
    try {
      const response = await fetch(`${ORDS_BASE_URL}/game/${gameId}/gamers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gamer_name: gamerName
        })
      });
      
      if (!response.ok) throw new Error('Failed to remove gamer');
      
      fetchGames(); // Refresh the list
    
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter games (now done client-side for basic search, server-side for playable games)
  const filteredGames = games.filter(game => {
    const matchesSearch = game.game.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGamer = !searchGamer || game.gamers.some(gamer => 
      gamer.toLowerCase().includes(searchGamer.toLowerCase())
    );
    
    return matchesSearch && matchesGamer;
  });

  const GameCard = ({ game }) => {
    const [newGamer, setNewGamer] = useState('');
    
    // Check if this game can be played by the specified group
    let canPlayWithGroup = false;
    let playersWhoOwnGame = [];
    if (showPlayableGames && playersLookingToPlay.trim()) {
      playersWhoOwnGame = game.owners_in_group || [];
      canPlayWithGroup = playersWhoOwnGame.length > 0;
    }

    return (
      <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 hover:shadow-lg ${
        showPlayableGames && canPlayWithGroup ? 'border-green-500' : 'border-blue-500'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{game.game}</h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-gray-600">
                <Users size={16} />
                Max Players: {game.players}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Database size={16} />
                Owners: {game.gamers.length}
              </span>
              {showPlayableGames && canPlayWithGroup && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                  ✓ Playable
                </span>
              )}
            </div>
            {showPlayableGames && canPlayWithGroup && playersWhoOwnGame.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-green-700">
                  Owned by: {playersWhoOwnGame.join(', ')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => deleteGame(game.id)}
            className="text-red-500 hover:text-red-700 p-1 transition-colors"
            title="Delete game"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Game Owners:</h4>
          <div className="flex flex-wrap gap-2">
            {game.gamers.length > 0 ? (
              game.gamers.map((gamer, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {gamer}
                  <button
                    onClick={() => removeGamerFromGame(game.id, gamer)}
                    className="text-red-500 hover:text-red-700 ml-1 transition-colors"
                    title="Remove gamer"
                  >
                    <UserMinus size={14} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">No owners yet</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new gamer..."
            value={newGamer}
            onChange={(e) => setNewGamer(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addGamerToGame(game.id, newGamer);
                setNewGamer('');
              }
            }}
          />
          <button
            onClick={() => {
              addGamerToGame(game.id, newGamer);
              setNewGamer('');
            }}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-1 transition-colors"
          >
            <UserPlus size={16} />
            Add
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <Database size={32} />
          Games Database Manager
        </h1>

        {/* Navigation Tabs */}
        <div className="flex mb-6 bg-white rounded-lg shadow-md p-1">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'view' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye size={16} />
            View Games
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'add' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Plus size={16} />
            Add Game
          </button>
        </div>

        {/* View Games Tab */}
        {activeTab === 'view' && (
          <div>
            {/* Error Display */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                <AlertCircle size={16} />
                <div className="flex-1">
                  <strong>Error:</strong> {error}
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 text-xl"
                >
                  ×
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading games...</p>
              </div>
            )}

            {!loading && (
              <>
                {/* Search and Filter Controls */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search by Game Name
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search games..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search by Gamer Name
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search gamers..."
                          value={searchGamer}
                          onChange={(e) => setSearchGamer(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Game Finder Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter size={16} className="text-green-600" />
                      <h3 className="text-lg font-medium text-gray-800">Game Finder</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Players Looking to Play (comma-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Alice, Bob, Charlie"
                          value={playersLookingToPlay}
                          onChange={(e) => setPlayersLookingToPlay(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter names of players who want to play together
                        </p>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={applyGameFinder}
                          disabled={!playersLookingToPlay.trim()}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          <Filter size={16} />
                          Find Games
                        </button>
                        {showPlayableGames && (
                          <button
                            onClick={clearGameFinder}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {showPlayableGames && playersLookingToPlay.trim() && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>Looking for games that:</strong>
                        </p>
                        <ul className="text-sm text-green-700 mt-1 ml-4">
                          <li>• Support {playersLookingToPlay.split(',').filter(p => p.trim()).length} players</li>
                          <li>• Are owned by at least one of: {playersLookingToPlay}</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-4">
                    Showing {filteredGames.length} of {games.length} games
                  </div>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredGames.map(game => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>

                {filteredGames.length === 0 && games.length === 0 && (
                  <div className="text-center py-12">
                    <Database size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No games found. Add some games to get started!</p>
                  </div>
                )}

                {filteredGames.length === 0 && games.length > 0 && (
                  <div className="text-center py-12">
                    <Search size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No games found matching your criteria.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add Game Tab */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game Name
                </label>
                <input
                  type="text"
                  placeholder="Enter game name..."
                  value={newGame.game}
                  onChange={(e) => setNewGame({ ...newGame, game: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Players
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Enter max players..."
                  value={newGame.players}
                  onChange={(e) => setNewGame({ ...newGame, players: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Gamers (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Enter gamer names separated by commas..."
                  value={newGame.gamers}
                  onChange={(e) => setNewGame({ ...newGame, gamers: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Example: Alice, Bob, Charlie
                </p>
              </div>
              <button
                onClick={addGame}
                disabled={!newGame.game || !newGame.players}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Add Game
              </button>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Database Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{games.length}</div>
              <div className="text-sm text-gray-600">Total Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {[...new Set(games.flatMap(g => g.gamers))].length}
              </div>
              <div className="text-sm text-gray-600">Unique Gamers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {games.reduce((sum, g) => sum + g.gamers.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Ownerships</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesDatabase;