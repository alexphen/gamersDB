import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Trash2, UserPlus, UserMinus, Database, Eye, Filter, AlertCircle, X, ChevronDown, Edit, Shuffle } from 'lucide-react';

const GamesDatabase = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGamer, setSearchGamer] = useState('');
  const [playersLookingToPlay, setPlayersLookingToPlay] = useState([]);
  const [newGame, setNewGame] = useState({ game: '', players: '', gamers: '', newGamerName: '', fullPartyOnly: false, remotePlay: false });
  const [showPlayableGames, setShowPlayableGames] = useState(false);
  const [selectedGamers, setSelectedGamers] = useState([]);
  const [randomGame, setRandomGame] = useState(null);

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
      await fetchGames(true, playersLookingToPlay); // Pass the current players directly
    }
  };

  // Clear game finder filter
  const clearGameFinder = async () => {
    setShowPlayableGames(false);
    setPlayersLookingToPlay([]);
    await fetchGames(false, []); // Explicitly fetch all games
  };

  // Add player to the game finder list
  const addPlayerToFinder = (playerName) => {
    const trimmedName = playerName.trim();
    if (trimmedName && !playersLookingToPlay.includes(trimmedName)) {
      const newPlayers = [...playersLookingToPlay, trimmedName];
      setPlayersLookingToPlay(newPlayers);
    }
  };

  // Remove player from the game finder list
  const removePlayerFromFinder = (playerName) => {
    const updatedPlayers = playersLookingToPlay.filter(p => p !== playerName);
    setPlayersLookingToPlay(updatedPlayers);
    
    // If no players left, clear the filter
    if (updatedPlayers.length === 0) {
      setShowPlayableGames(false);
      fetchGames(false, []);
    }
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
  const fetchGames = async (forcePlayableFilter = null, playersList = null) => {
    try {
      setLoading(true);
      
      // Determine which endpoint to use
      const shouldShowPlayable = forcePlayableFilter !== null ? forcePlayableFilter : showPlayableGames;
      const playersToUse = playersList !== null ? playersList : playersLookingToPlay;
      
      // Choose endpoint based on whether we're filtering for playable games
      const endpoint = shouldShowPlayable && playersToUse.length > 0
        ? `${API_BASE_URL}/playable?players=${encodeURIComponent(playersToUse.join(','))}`
        : `${API_BASE_URL}/all`;
      
      console.log('Fetching from endpoint:', endpoint);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch games');
      }
      
      const data = await response.json();
      console.log('Fetch response:', data);

      const transformedGames = data.items.map(item => ({
        id: item.rowid,
        game: item.game,
        players: item.players,
        gamers: item.gamer_list
      }));
      
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
            gamers: selectedGamers.join(','),
            fullPartyOnly: newGame.fullPartyOnly,
            remotePlay: newGame.remotePlay
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add game');
        }
        
        setNewGame({ 
          game: '', 
          players: '', 
          gamers: '', 
          newGamerName: '', 
          fullPartyOnly: false, 
          remotePlay: false 
        });
        setSelectedGamers([]);
        fetchGames(showPlayableGames, playersLookingToPlay);
        
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
        method: 'DELETE',
        body: id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete game');
      }
      
      fetchGames(showPlayableGames, playersLookingToPlay); // Maintain current filter state

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
        
        fetchGames(showPlayableGames, playersLookingToPlay); // Maintain current filter state
        
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
          gamer_name: gamerName,
          gameID: gameId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove gamer');
      }
      
      fetchGames(showPlayableGames, playersLookingToPlay); // Maintain current filter state
    
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
    
    return matchesSearch && matchesGamer;
  });

  const selectRandomGame = () => {
    const validGames = filteredGames.filter(game => {
      if (playersLookingToPlay.length === 0) return false;
      
      if (game.remotePlay) {
        // For remote play, only need one owner
        const hasOwner = playersLookingToPlay.some(player => game.gamers.includes(player));
        if (!hasOwner) return false;
      } else {
        // For regular games, all players must own it
        const allPlayersOwn = playersLookingToPlay.every(player => game.gamers.includes(player));
        if (!allPlayersOwn) return false;
      }
      
      // Check full party requirement
      if (game.fullPartyOnly && playersLookingToPlay.length !== game.players) {
        return false;
      }
      
      // Check if game can accommodate the number of players
      if (game.players < playersLookingToPlay.length) {
        return false;
      }
      
      return true;
    });
    
    if (validGames.length > 0) {
      const randomIndex = Math.floor(Math.random() * validGames.length);
      setRandomGame(validGames[randomIndex]);
    } else {
      setRandomGame(null);
    }
  };

  const GameCard = ({ game }) => {
    const [newGamer, setNewGamer] = useState('');
    const [selectedExistingGamer, setSelectedExistingGamer] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedGame, setEditedGame] = useState({ game: game.game, players: game.players });

    // Get available gamers (not already in this game)
    const availableGamers = getAllGamers().filter(gamer => !game.gamers.includes(gamer));

    // Add existing gamer to game
    const addExistingGamer = () => {
      if (selectedExistingGamer) {
        addGamerToGame(game.id, selectedExistingGamer);
        setSelectedExistingGamer('');
        setShowDropdown(false);
      }
    };

    const updateGame = async () => {
      if (editedGame.game && editedGame.players) {
        try {
          const response = await fetch(`${API_BASE_URL}/game/${game.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              game: editedGame.game,
              players: parseInt(editedGame.players)
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update game');
          }
          
          setIsEditing(false);
          fetchGames(showPlayableGames, playersLookingToPlay);
        } catch (err) {
          console.error('Update game error:', err);
          setError(err.message);
        }
      }
    };

    let canPlayWithGroup = false;
    if (showPlayableGames && playersLookingToPlay.length > 0) {
      if (game.remotePlay) {
        // For remote play games, only one owner needs to be selected
        canPlayWithGroup = playersLookingToPlay.some(player => game.gamers.includes(player));
      } else {
        // For regular games, all players must own the game
        canPlayWithGroup = playersLookingToPlay.every(player => game.gamers.includes(player));
      }
      
      // Check full party requirement
      if (game.fullPartyOnly && playersLookingToPlay.length !== game.players) {
        canPlayWithGroup = false;
      }
    }

     return (
      <div className={`bg-gray-800 rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 hover:shadow-lg ${
        showPlayableGames && canPlayWithGroup ? 'border-green-500' : 'border-blue-500'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedGame.game}
                  onChange={(e) => setEditedGame({ ...editedGame, game: e.target.value })}
                  className="text-xl font-bold bg-gray-700 text-white px-2 py-1 rounded w-full"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editedGame.players}
                  onChange={(e) => setEditedGame({ ...editedGame, players: e.target.value })}
                  className="bg-gray-700 text-white px-2 py-1 rounded w-24"
                />
                <div className="flex gap-2">
                  <button
                    onClick={updateGame}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-white">{game.game}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-gray-300">
                    <Users size={16} />
                    Max Players: {game.players}
                  </span>
                  {game.remotePlay && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                      Remote Play
                    </span>
                  )}
                  {game.fullPartyOnly && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                      Full Party Only
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
              title="Edit game"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => deleteGame(game.id)}
              className="text-red-500 hover:text-red-700 p-1 transition-colors"
              title="Delete game"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Game Owners section remains the same */}
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

        {/* Add Gamers toggle and multiselect panel */}
        <div className="space-y-2">
          {/* Toggle */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-blue-400 hover:text-blue-200 text-sm flex items-center gap-1"
          >
            Add Gamers...
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Expandable Multiselect Panel */}
          {showDropdown && (
            <div className="bg-gray-700 rounded p-4 space-y-4 border border-gray-600">
              {/* Select Multiple Existing Gamers */}
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">Select Gamers to Add:</h5>
                <div className="flex flex-wrap gap-2">
                  {availableGamers.map((gamer) => {
                    const isSelected = selectedExistingGamer.includes(gamer);
                    return (
                      <button
                        key={gamer}
                        onClick={() => {
                          setSelectedExistingGamer(prev =>
                            isSelected
                              ? prev.filter(g => g !== gamer)
                              : [...prev, gamer]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                          isSelected
                            ? 'bg-green-200 text-green-800'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {gamer}
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional New Gamer Input */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Add new gamer..."
                  value={newGamer}
                  onChange={(e) => setNewGamer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGamer.trim()) {
                      setSelectedExistingGamer([...selectedExistingGamer, newGamer.trim()]);
                      setNewGamer('');
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-500 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (newGamer.trim()) {
                      setSelectedExistingGamer([...selectedExistingGamer, newGamer.trim()]);
                      setNewGamer('');
                    }
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-1 transition-colors"
                >
                  <UserPlus size={16} />
                  Queue
                </button>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    selectedExistingGamer.forEach(gamer => addGamerToGame(game.id, gamer));
                    setSelectedExistingGamer([]);
                    setShowDropdown(false); // optional collapse
                  }}
                  disabled={selectedExistingGamer.length === 0}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Selected Gamers
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
          <Database size={32} />
          Gamers Database Manager
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
                        <div className="grid grid-cols-1">
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
                      
                      <div className="flex gap-2items-start flex-wrap">
                        <button
                          onClick={applyGameFinder}
                          disabled={playersLookingToPlay.length === 0}
                          className="bg-green-500 text-white px-4 py-2 rounded-md height-1500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                          <Filter size={16} />
                          Filter by Players
                        </button>
                        {showPlayableGames && (
                          <button
                            onClick={clearGameFinder}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors">
                            Clear Filter
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={selectRandomGame}
                            disabled={playersLookingToPlay.length === 0}
                            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                          >
                            <Shuffle size={16} />
                            Pick Random Game
                          </button>
                          {randomGame && (
                            <button
                              onClick={() => setRandomGame(null)}
                              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2 transition-colors"
                            >
                              Clear Selection
                            </button>
                          )}
                        </div>
                      </div>
                      {randomGame && (
                        <div className="mt-4 p-4 bg-purple-900 rounded-md border border-purple-500">
                          <h4 className="text-lg font-bold text-white mb-2">🎲 Random Game Selection</h4>
                          <div className="text-purple-200">
                            <p className="text-xl font-semibold">{randomGame.game}</p>
                            <p className="text-sm">Max Players: {randomGame.players}</p>
                            <p className="text-sm">Owners: {randomGame.gamers.join(', ')}</p>
                            {randomGame.remotePlay && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Remote Play</span>}
                            {randomGame.fullPartyOnly && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs ml-2">Full Party Only</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {showPlayableGames && playersLookingToPlay.length > 0 && (
                      <div className="mt-3 p-3 bg-green-900 rounded-md">
                        <p className="text-sm text-green-200">
                          <strong>Showing {playersLookingToPlay.length}+ player games that ALL of these players own:</strong> {playersLookingToPlay.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-4">
                    Showing {filteredGames.length} of {games.length} games
                  </div>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 items-start lg:grid-cols-2 gap-6">
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
                className="w-full px-3 py-2 border border-gray-700 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Game Flags */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Options
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fullPartyOnly"
                  checked={newGame.fullPartyOnly}
                  onChange={(e) => setNewGame({ ...newGame, fullPartyOnly: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="fullPartyOnly" className="text-sm text-gray-300">
                  Full Party Only (requires exact player count)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remotePlay"
                  checked={newGame.remotePlay}
                  onChange={(e) => setNewGame({ ...newGame, remotePlay: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remotePlay" className="text-sm text-gray-300">
                  Remote Play (only owner needs to own the game)
                </label>
              </div>
            </div>
            
            {/* Game Owners section remains the same */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Existing Players
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  {getAllGamers().filter(gamer => !selectedGamers.includes(gamer)).map(gamer => (
                    <label key={gamer} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-gray-700 p-1 rounded">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            addGamerToSelected(gamer);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-300">{gamer}</span>
                    </label>
                  ))}
                  
                  {/* Add New Gamer as last entry */}
                  <div className="flex items-center space-x-2 mb-2 p-1 rounded">
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        placeholder="Enter new gamer name..."
                        value={newGame.newGamerName}
                        onChange={(e) => setNewGame({ ...newGame, newGamerName: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-700 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
      </div>
    </div>
  );
};

export default GamesDatabase;