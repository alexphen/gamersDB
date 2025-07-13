import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Trash2, UserPlus, UserMinus, Database, Eye, Filter, AlertCircle, X, ChevronDown } from 'lucide-react';

const GamesDatabase = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGamer, setSearchGamer] = useState('');
  const [playersLookingToPlay, setPlayersLookingToPlay] = useState([]);
  const [newGame, setNewGame] = useState({ game: '', players: '', gamers: '', newGamerName: '' });
  const [editingGame, setEditingGame] = useState(null);
  const [showPlayableGames, setShowPlayableGames] = useState(false);
  const [showGamerDropdown, setShowGamerDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [selectedGamers, setSelectedGamers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Updated to use Node.js backend
  const API_BASE_URL = process.env.REACT_APP_API_URL;// || "http://localhost:3001/api/games";

  // Get all unique gamers from the games
  const getAllGamers = () => {
    const allGamers = games.flatMap(game => game.gamers);
    return [...new Set(allGamers)].sort();
  };

  // Apply game finder filter - find games that ALL listed players own
  const applyGameFinder = async () => {
    if (playersLookingToPlay.length > 0) {
      setShowPlayableGames(true);
      await fetchGames();
    }
  };

  // Clear game finder filter
  const clearGameFinder = () => {
    setShowPlayableGames(false);
    setPlayersLookingToPlay([]);
    fetchGames();
  };

  // Add player to the game finder list
  const addPlayerToFinder = (playerName) => {
    const trimmedName = playerName.trim();
    if (trimmedName && !playersLookingToPlay.includes(trimmedName)) {
      setPlayersLookingToPlay([...playersLookingToPlay, trimmedName]);
    }
    setNewPlayerName('');
  };

  // Remove player from the game finder list
  const removePlayerFromFinder = (playerName) => {
    setPlayersLookingToPlay(playersLookingToPlay.filter(p => p !== playerName));
  };

  // Add gamer to selected list for new game
  const addGamerToSelected = (gamerName) => {
    if (!selectedGamers.includes(gamerName)) {
      setSelectedGamers([...selectedGamers, gamerName]);
    }
  };

  // Remove gamer from selected list
  const removeGamerFromSelected = (gamerName) => {
    setSelectedGamers(selectedGamers.filter(g => g !== gamerName));
  };

  // Add new gamer to selected list
  const addNewGamerToSelected = () => {
    const trimmedName = newGame.newGamerName.trim();
    if (trimmedName && !selectedGamers.includes(trimmedName)) {
      setSelectedGamers([...selectedGamers, trimmedName]);
      setNewGame({ ...newGame, newGamerName: '' });
    }
  };

  // Fetch games from Node.js backend
  // Fixed fetchGames function for App.js
const fetchGames = async () => {
  try {
    setLoading(true);
    
    // Choose endpoint based on whether we're filtering for playable games
    const endpoint = showPlayableGames && playersLookingToPlay.length > 0
      ? `${API_BASE_URL}/playable?players=${encodeURIComponent(playersLookingToPlay.join(','))}`
      : `${API_BASE_URL}/all`;
      
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch games');
    }
    
    const data = await response.json();

    const transformedGames = data.items.map(item => {
      // Handle both array and string formats for gamer_list
      let gamers = [];
      if (item.gamer_list) {
        if (Array.isArray(item.gamer_list)) {
          // If it's already an array, use it directly
          gamers = item.gamer_list.map(g => g.trim()).filter(g => g);
        } else if (typeof item.gamer_list === 'string') {
          // If it's a string, split it
          gamers = item.gamer_list.split(',').map(g => g.trim()).filter(g => g);
        }
      }

      // Handle owners_in_group similarly
      let ownersInGroup = [];
      if (item.owners_in_group) {
        if (Array.isArray(item.owners_in_group)) {
          ownersInGroup = item.owners_in_group.map(g => g.trim()).filter(g => g);
        } else if (typeof item.owners_in_group === 'string') {
          ownersInGroup = item.owners_in_group.split(',').map(g => g.trim()).filter(g => g);
        }
      }

      return {
        id: item.rowid,
        game: item.game,
        players: item.players,
        gamers: gamers,
        owners_in_group: ownersInGroup
      };
    });
    
    setGames(transformedGames);
    setError(null);
    
  } catch (err) {
    console.error('Fetch error:', err);
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
    if (newGame.game && newGame.players && selectedGamers.length > 0) {
      try {
        const response = await fetch(`${API_BASE_URL}/all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            game: newGame.game,
            players: parseInt(newGame.players),
            gamers: selectedGamers.join(',')
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add game');
        }
        
        setNewGame({ game: '', players: '', gamers: '', newGamerName: '' });
        setSelectedGamers([]);
        fetchGames(); // Refresh the list
        
      } catch (err) {
        console.error('Add game error:', err);
        setError(err.message);
      }
    }
  };

  // Delete game
  const deleteGame = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete game');
      }
      
      fetchGames(); // Refresh the list

    } catch (err) {
      console.error('Delete game error:', err);
      setError(err.message);
    }
  };

  // Add gamer to game
  const addGamerToGame = async (gameId, gamerName) => {
    if (gamerName.trim()) {
      try {
        const response = await fetch(`${API_BASE_URL}/game/${gameId}/gamers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gamer_name: gamerName.trim()
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add gamer');
        }
        
        fetchGames(); // Refresh the list
        
      } catch (err) {
        console.error('Add gamer error:', err);
        setError(err.message);
      }
    }
  };

  // Remove gamer from game
  const removeGamerFromGame = async (gameId, gamerName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/game/${gameId}/gamers`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gamer_name: gamerName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove gamer');
      }
      
      fetchGames(); // Refresh the list
    
    } catch (err) {
      console.error('Remove gamer error:', err);
      setError(err.message);
    }
  };

  // Filter games (client-side for basic search, server-side for playable games)
  const filteredGames = games.filter(game => {
    const matchesSearch = game.game.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGamer = !searchGamer || game.gamers.some(gamer => 
      gamer.toLowerCase().includes(searchGamer.toLowerCase())
    );
    
    // If we're showing playable games, filter for games that ALL selected players own
    if (showPlayableGames && playersLookingToPlay.length > 0) {
      const gameOwners = game.gamers;
      const allPlayersOwnGame = playersLookingToPlay.every(player => 
        gameOwners.includes(player)
      );
      return matchesSearch && matchesGamer && allPlayersOwnGame;
    }
    
    return matchesSearch && matchesGamer;
  });

  const GameCard = ({ game }) => {
    const [newGamer, setNewGamer] = useState('');
    
    // Check if this game can be played by the specified group
    let canPlayWithGroup = false;
    if (showPlayableGames && playersLookingToPlay.length > 0) {
      canPlayWithGroup = playersLookingToPlay.every(player => 
        game.gamers.includes(player)
      );
    }

    return (
      <div className={`bg-gray-800 rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 hover:shadow-lg ${
        showPlayableGames && canPlayWithGroup ? 'border-green-500' : 'border-blue-500'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{game.game}</h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-gray-300">
                <Users size={16} />
                Max Players: {game.players}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Database size={16} />
                Owners: {game.gamers.length}
              </span>
              {showPlayableGames && canPlayWithGroup && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                  ✓ All Players Own This Game
                </span>
              )}
            </div>
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
          <h4 className="font-semibold text-gray-300 mb-2">Game Owners:</h4>
          <div className="flex flex-wrap gap-2">
            {game.gamers.length > 0 ? (
              game.gamers.map((gamer, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    showPlayableGames && playersLookingToPlay.includes(gamer)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
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

  // Multi-select dropdown for gamers
  const GamerMultiSelect = ({ availableGamers, selectedGamers, onAdd, onRemove, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const availableToAdd = availableGamers.filter(gamer => !selectedGamers.includes(gamer));

    return (
      <div className="relative">
        <div className="border border-gray-300 rounded-md p-2 min-h-[42px] cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex flex-wrap gap-1">
            {selectedGamers.length > 0 ? (
              selectedGamers.map(gamer => (
                <span key={gamer} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                  {gamer}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(gamer);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown size={16} className="absolute right-2 top-3 text-gray-500" />
        </div>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {availableToAdd.length > 0 ? (
              availableToAdd.map(gamer => (
                <div
                  key={gamer}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onAdd(gamer);
                    setIsOpen(false);
                  }}
                >
                  {gamer}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500">No more gamers to add</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
          <Database size={32} />
          Games Database Manager
        </h1>

        {/* Navigation Tabs */}
        <div className="flex mb-6 bg-gray-800 rounded-lg shadow-md p-1">
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
              <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
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
                <p className="mt-2 text-gray-300">Loading games...</p>
              </div>
            )}

            {!loading && (
              <>
                {/* Search and Filter Controls */}
                <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Search by Game Name
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search games..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Search by Gamer Name
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search gamers..."
                          value={searchGamer}
                          onChange={(e) => setSearchGamer(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Game Finder Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter size={16} className="text-green-600" />
                      <h3 className="text-lg font-medium text-white">Game Finder</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Players Looking to Play Together
                        </label>
                        
                        {/* Selected Players */}
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {playersLookingToPlay.map(player => (
                              <span key={player} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                {player}
                                <button
                                  onClick={() => removePlayerFromFinder(player)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                            {playersLookingToPlay.length === 0 && (
                              <span className="text-gray-500 text-sm">No players selected</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Add Players */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Select Existing Players
                            </label>
                            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                              {getAllGamers().filter(gamer => !playersLookingToPlay.includes(gamer)).length > 0 ? (
                                getAllGamers().filter(gamer => !playersLookingToPlay.includes(gamer)).map(gamer => (
                                  <label key={gamer} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-gray-900 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          addPlayerToFinder(gamer);
                                        }
                                      }}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-300">{gamer}</span>
                                  </label>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No available players</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={applyGameFinder}
                          disabled={playersLookingToPlay.length === 0}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          <Filter size={16} />
                          Find Games All Players Own
                        </button>
                        {showPlayableGames && (
                          <button
                            onClick={clearGameFinder}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors"
                          >
                            Clear Filter
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {showPlayableGames && playersLookingToPlay.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>Showing games that ALL of these players own:</strong> {playersLookingToPlay.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-4">
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
                    <Database size={48} className="mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-500">No games found. Add some games to get started!</p>
                  </div>
                )}

                {filteredGames.length === 0 && games.length > 0 && (
                  <div className="text-center py-12">
                    <Search size={48} className="mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-500">No games found matching your criteria.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add Game Tab */}
        {activeTab === 'add' && (
          <div className="bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Game</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Game Name
                </label>
                <input
                  type="text"
                  placeholder="Enter game name..."
                  value={newGame.game}
                  onChange={(e) => setNewGame({ ...newGame, game: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Owners
                </label>
                
                {/* Selected Gamers Display */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedGamers.map(gamer => (
                      <span key={gamer} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        {gamer}
                        <button
                          onClick={() => removeGamerFromSelected(gamer)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {selectedGamers.length === 0 && (
                      <span className="text-gray-500 text-sm">No owners selected</span>
                    )}
                  </div>
                </div>
                
                {/* Add Players */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Existing Players
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    {getAllGamers().filter(gamer => !selectedGamers.includes(gamer)).map(gamer => (
                      <label key={gamer} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              addGamerToSelected(gamer);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{gamer}</span>
                      </label>
                    ))}
                    
                    {/* Add New Gamer as last entry */}
                    <div className="flex items-center space-x-2 mb-2 p-1 rounded border-t pt-2 mt-2">
                      <div className="flex gap-2 flex-1">
                        <input
                          type="text"
                          placeholder="Enter new gamer name..."
                          value={newGame.newGamerName}
                          onChange={(e) => setNewGame({ ...newGame, newGamerName: e.target.value })}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addNewGamerToSelected();
                            }
                          }}
                        />
                        <button
                          onClick={addNewGamerToSelected}
                          disabled={!newGame.newGamerName.trim()}
                          className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  Select from existing gamers or add new ones. At least one owner is required.
                </p>
              </div>
              
              <button
                onClick={addGame}
                disabled={!newGame.game || !newGame.players || selectedGamers.length === 0}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Add Game
              </button>
            </div>
          </div>
        )}

        {/* Summary Statistics
        <div className="mt-8 bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-white mb-4">Database Summary</h2>
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
        </div> */}
      </div>
    </div>
  );
};

export default GamesDatabase;