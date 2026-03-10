/* ============================================================
   Badminton 2x2 — Queue Manager
   Main application logic (App object defined in i18n.js)
   ============================================================ */


// ============================================================
// ANALYTICS — Google Analytics event tracking
// ============================================================
App.Analytics = {
  track: function(event, params) {
    if (typeof gtag === 'function') {
      gtag('event', event, params || {});
    }
  }
};

// ============================================================
// UTILS — Helper functions
// ============================================================
App.Utils = {
  generateId: function(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  },

  formatTime: function(ms) {
    if (!ms || ms <= 0) return '0:00';
    var totalSec = Math.floor(ms / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  },

  formatDate: function(date) {
    var d = date instanceof Date ? date : new Date(date);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '.' + mm + '.' + yyyy;
  },

  getDayName: function(date) {
    var days = App.t('days');
    var d = date instanceof Date ? date : new Date(date);
    return days[d.getDay()];
  },

  getISODate: function(date) {
    var d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  },

  formatTimestamp: function(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
};

// ============================================================
// STORAGE — localStorage + export/import
// ============================================================
App.Storage = {
  SESSION_PREFIX: 'badminton_session_',
  SETTINGS_KEY: 'badminton_settings',
  INDEX_KEY: 'badminton_sessions_index',

  save: function() {
    if (!App.state) return;
    App.state.lastModified = Date.now();
    var key = this.SESSION_PREFIX + App.state.date;
    try {
      localStorage.setItem(key, JSON.stringify(App.state));
      // Update session index
      var index = this.getIndex();
      if (index.indexOf(App.state.date) === -1) {
        index.unshift(App.state.date);
        localStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  },

  load: function(dateStr) {
    var key = this.SESSION_PREFIX + (dateStr || App.Utils.getISODate(new Date()));
    var data = localStorage.getItem(key);
    if (data) {
      try {
        var parsed = JSON.parse(data);
        return this._ensureState(parsed);
      } catch (e) {
        console.error('Load error:', e);
      }
    }
    return null;
  },

  // Ensure all required state fields exist (migration/corruption safety)
  _ensureState: function(state) {
    if (!state || typeof state !== 'object') return null;
    if (!state.players || typeof state.players !== 'object') state.players = {};
    if (!Array.isArray(state.waitingQueue)) state.waitingQueue = [];
    if (!state.courts || typeof state.courts !== 'object') state.courts = {};
    if (!state.matches || typeof state.matches !== 'object') state.matches = {};
    if (!state.settings || typeof state.settings !== 'object') {
      state.settings = { courtNumbers: [1,2,3,4], syncEnabled: false, syncSessionId: null };
    }
    if (!state.nextPlayerNumber) state.nextPlayerNumber = 1;
    if (!state.date) state.date = App.Utils.getISODate(new Date());
    if (state.isAdmin === undefined) state.isAdmin = true;
    // Ensure player fields (migration)
    Object.values(state.players).forEach(function(p) {
      if (!p.partnerHistory) p.partnerHistory = {};
      if (!p.opponentHistory) p.opponentHistory = {};
      if (p.wins === undefined) p.wins = 0;
      if (p.losses === undefined) p.losses = 0;
      if (p.pointsScored === undefined) p.pointsScored = 0;
      if (p.pointsConceded === undefined) p.pointsConceded = 0;
      // Migrate wishedPartner (single) → wishedPartners (array)
      if (!Array.isArray(p.wishedPartners)) {
        if (p.wishedPartner) {
          p.wishedPartners = [p.wishedPartner];
        } else {
          p.wishedPartners = [];
        }
      }
      if (!Array.isArray(p.wishesFulfilled)) {
        p.wishesFulfilled = p.wishFulfilled && p.wishedPartner ? [p.wishedPartner] : [];
      }
      delete p.wishedPartner;
      delete p.wishFulfilled;
    });
    return state;
  },

  getIndex: function() {
    try {
      return JSON.parse(localStorage.getItem(this.INDEX_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  getSettings: function() {
    try {
      return JSON.parse(localStorage.getItem(this.SETTINGS_KEY)) || {};
    } catch (e) {
      return {};
    }
  },

  saveSettings: function(settings) {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  },

  exportJSON: function() {
    var blob = new Blob([JSON.stringify(App.state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'badminton_' + App.state.date + '.json';
    a.click();
    URL.revokeObjectURL(url);
    App.UI.showToast(App.t('exportDone'));
  },

  importJSON: function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data.version && data.players && data.courts) {
          App.state = data;
          App.save();
          App.UI.renderAll();
          App.UI.showToast(App.t('importDone'));
        } else {
          App.UI.showToast(App.t('invalidFile'));
        }
      } catch (err) {
        App.UI.showToast(App.t('fileReadError'));
      }
    };
    reader.readAsText(file);
  }
};

// ============================================================
// SESSION — Session management
// ============================================================
App.Session = {
  create: function(dayName) {
    var today = new Date();
    var dateStr = App.Utils.getISODate(today);

    App.state = {
      version: 1,
      date: dateStr,
      dayName: dayName || App.Utils.getDayName(today),
      players: {},
      waitingQueue: [],
      courts: {},
      matches: {},
      settings: {
        courtNumbers: [1, 2, 3, 4],
        syncEnabled: false,
        syncSessionId: null
      },
      nextPlayerNumber: 1,
      lastModified: Date.now(),
      isAdmin: true // session creator is admin
    };

    App.save();
    return App.state;
  },

  resetToday: function() {
    // Reset day stats but keep players
    var players = App.state.players;
    Object.keys(players).forEach(function(id) {
      players[id].present = false;
      players[id].gamesPlayed = 0;
      players[id].lastGameEndTime = 0;
      players[id].queueEntryTime = 0;
      players[id].partnerHistory = {};
      players[id].opponentHistory = {};
      players[id].wishesFulfilled = [];
      players[id].number = 0;
    });
    App.state.waitingQueue = [];
    App.state.matches = {};
    App.state.nextPlayerNumber = 1;

    // Reset courts
    Object.keys(App.state.courts).forEach(function(id) {
      App.state.courts[id].occupied = false;
      App.state.courts[id].currentMatch = null;
      App.state.courts[id].gameStartTime = null;
    });

    App.save();
    App.UI.renderAll();
    App.UI.showToast(App.t('dayReset'));
  },

  initCourts: function(numbers) {
    var newCourts = {};
    numbers.forEach(function(num) {
      var id = 'c_' + num;
      // Preserve existing court if it exists
      if (App.state.courts[id]) {
        newCourts[id] = App.state.courts[id];
        newCourts[id].displayNumber = num;
      } else {
        newCourts[id] = {
          id: id,
          displayNumber: num,
          active: true,
          occupied: false,
          currentMatch: null,
          gameStartTime: null
        };
      }
    });
    App.state.courts = newCourts;
    App.save();
  }
};

// ============================================================
// PLAYERS — Player management
// ============================================================
App.Players = {
  add: function(name) {
    if (!name || !name.trim()) return null;
    name = name.trim();

    var id = App.Utils.generateId('p');
    App.state.players[id] = {
      id: id,
      number: 0, // number assigned on mark present
      name: name,
      present: false,
      gamesPlayed: 0,
      lastGameEndTime: 0,
      queueEntryTime: 0,
      partnerHistory: {},
      opponentHistory: {},
      wishedPartners: [],
      wishesFulfilled: [],
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsConceded: 0
    };

    App.save();
    return id;
  },

  remove: function(playerId) {
    // Remove from queue
    App.Queue.remove(playerId);
    // Cannot delete if on court
    if (this.isOnCourt(playerId)) {
      App.UI.showToast(App.t('cantDeletePlaying'));
      return false;
    }
    delete App.state.players[playerId];
    // Remove wishes targeting this player
    Object.values(App.state.players).forEach(function(p) {
      var idx = p.wishedPartners.indexOf(playerId);
      if (idx !== -1) {
        p.wishedPartners.splice(idx, 1);
        var fi = p.wishesFulfilled.indexOf(playerId);
        if (fi !== -1) p.wishesFulfilled.splice(fi, 1);
      }
    });
    App.save();
    return true;
  },

  markPresent: function(playerId) {
    var p = App.state.players[playerId];
    if (!p) return;
    if (p.present) return; // already marked

    p.present = true;
    p.number = App.state.nextPlayerNumber++;
    p.queueEntryTime = Date.now();

    // Add to end of queue
    App.Queue.add(playerId);
    App.save();
  },

  markAbsent: function(playerId) {
    var p = App.state.players[playerId];
    if (!p) return;
    if (this.isOnCourt(playerId)) {
      App.UI.showToast(App.t('playerOnCourt'));
      return;
    }
    p.present = false;
    App.Queue.remove(playerId);
    App.save();
  },

  setWish: function(playerId, partnerId) {
    var p = App.state.players[playerId];
    if (!p) return;
    if (!Array.isArray(p.wishedPartners)) p.wishedPartners = [];
    if (!Array.isArray(p.wishesFulfilled)) p.wishesFulfilled = [];
    if (!partnerId) {
      // Clear all wishes
      p.wishedPartners = [];
      p.wishesFulfilled = [];
    } else {
      var idx = p.wishedPartners.indexOf(partnerId);
      if (idx !== -1) {
        // Remove wish (toggle off)
        p.wishedPartners.splice(idx, 1);
        var fi = p.wishesFulfilled.indexOf(partnerId);
        if (fi !== -1) p.wishesFulfilled.splice(fi, 1);
      } else {
        // Add wish
        p.wishedPartners.push(partnerId);
      }
    }
    App.save();
  },

  isOnCourt: function(playerId) {
    var matches = App.state.matches;
    return Object.values(matches).some(function(m) {
      return m.status === 'playing' &&
        (m.teamA.indexOf(playerId) !== -1 || m.teamB.indexOf(playerId) !== -1);
    });
  },

  getCourtId: function(playerId) {
    var matches = App.state.matches;
    var match = Object.values(matches).find(function(m) {
      return m.status === 'playing' &&
        (m.teamA.indexOf(playerId) !== -1 || m.teamB.indexOf(playerId) !== -1);
    });
    return match ? match.courtId : null;
  },

  getStatus: function(playerId) {
    var p = App.state.players[playerId];
    if (!p || !p.present) return 'absent';
    if (this.isOnCourt(playerId)) return 'playing';
    if (App.state.waitingQueue.indexOf(playerId) !== -1) return 'waiting';
    return 'present';
  },

  getPresent: function() {
    return Object.values(App.state.players).filter(function(p) { return p.present; });
  },

  getSorted: function() {
    return Object.values(App.state.players).sort(function(a, b) {
      // Present players first, then by number
      if (a.present !== b.present) return a.present ? -1 : 1;
      if (a.number && b.number) return a.number - b.number;
      return a.name.localeCompare(b.name);
    });
  }
};

// ============================================================
// QUEUE — Queue management
// ============================================================
App.Queue = {
  add: function(playerId) {
    if (App.state.waitingQueue.indexOf(playerId) !== -1) return; // already in queue
    if (App.Players.isOnCourt(playerId)) return; // on court
    App.state.waitingQueue.push(playerId);
    var p = App.state.players[playerId];
    if (p) p.queueEntryTime = Date.now();
  },

  remove: function(playerId) {
    var idx = App.state.waitingQueue.indexOf(playerId);
    if (idx !== -1) {
      App.state.waitingQueue.splice(idx, 1);
    }
  },

  move: function(playerId, newIndex) {
    this.remove(playerId);
    if (newIndex < 0) newIndex = 0;
    if (newIndex > App.state.waitingQueue.length) newIndex = App.state.waitingQueue.length;
    App.state.waitingQueue.splice(newIndex, 0, playerId);
    App.save();
  },

  moveToEnd: function(playerId) {
    this.remove(playerId);
    App.state.waitingQueue.push(playerId);
    App.save();
  },

  addMultipleToEnd: function(playerIds) {
    var self = this;
    playerIds.forEach(function(id) {
      self.remove(id); // remove if already present
    });
    playerIds.forEach(function(id) {
      App.state.waitingQueue.push(id);
      var p = App.state.players[id];
      if (p) p.queueEntryTime = Date.now();
    });
  },

  getPosition: function(playerId) {
    return App.state.waitingQueue.indexOf(playerId);
  }
};

// ============================================================
// COURTS — Court and game management
// ============================================================
App.Courts = {
  startGame: function(courtId, teamA, teamB) {
    var court = App.state.courts[courtId];
    if (!court) return null;
    if (court.occupied) {
      App.UI.showToast(App.t('courtOccupied'));
      return null;
    }

    // Check all 4 players are unique
    var allPlayers = teamA.concat(teamB);
    var unique = new Set(allPlayers);
    if (unique.size !== 4) {
      App.UI.showToast(App.t('playersDuplicate'));
      return null;
    }

    // Check none of them are already on court
    for (var i = 0; i < allPlayers.length; i++) {
      if (App.Players.isOnCourt(allPlayers[i])) {
        var pName = App.state.players[allPlayers[i]].name;
        App.UI.showToast(pName + App.t('alreadyOnCourt'));
        return null;
      }
    }

    // Remove all 4 from queue
    allPlayers.forEach(function(pid) {
      App.Queue.remove(pid);
    });

    // Create match
    var matchId = App.Utils.generateId('m');
    var now = Date.now();
    App.state.matches[matchId] = {
      id: matchId,
      startTime: now,
      endTime: null,
      courtId: courtId,
      teamA: teamA,
      teamB: teamB,
      score: null,
      status: 'playing'
    };

    court.occupied = true;
    court.currentMatch = matchId;
    court.gameStartTime = now;

    App.save();
    App.UI.showToast(App.t('gameStartedOn') + court.displayNumber);
    return matchId;
  },

  finishGame: function(courtId, score) {
    var court = App.state.courts[courtId];
    if (!court || !court.currentMatch) {
      App.UI.showToast(App.t('noActiveGame'));
      return;
    }

    var match = App.state.matches[court.currentMatch];
    if (!match || match.status !== 'playing') return;

    match.status = 'finished';
    match.endTime = Date.now();
    match.score = score || null;

    // Update player stats
    var allPlayers = match.teamA.concat(match.teamB);
    allPlayers.forEach(function(pid) {
      var p = App.state.players[pid];
      if (!p) return;
      p.gamesPlayed++;
      p.lastGameEndTime = match.endTime;
    });

    // Track win/loss/points if score provided (e.g. "21-15")
    if (score) {
      var parts = score.split('-').map(function(s) { return parseInt(s.trim()); });
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        var scoreA = parts[0], scoreB = parts[1];
        var winnersTeam = scoreA >= scoreB ? match.teamA : match.teamB;
        var losersTeam = scoreA >= scoreB ? match.teamB : match.teamA;
        var winnerScore = Math.max(scoreA, scoreB);
        var loserScore = Math.min(scoreA, scoreB);

        winnersTeam.forEach(function(pid) {
          var p = App.state.players[pid];
          if (!p) return;
          p.wins = (p.wins || 0) + 1;
          p.pointsScored = (p.pointsScored || 0) + winnerScore;
          p.pointsConceded = (p.pointsConceded || 0) + loserScore;
        });
        losersTeam.forEach(function(pid) {
          var p = App.state.players[pid];
          if (!p) return;
          p.losses = (p.losses || 0) + 1;
          p.pointsScored = (p.pointsScored || 0) + loserScore;
          p.pointsConceded = (p.pointsConceded || 0) + winnerScore;
        });
      }
    }

    // Update partner and opponent history
    this._updatePairStats(match.teamA[0], match.teamA[1], 'partner');
    this._updatePairStats(match.teamB[0], match.teamB[1], 'partner');
    match.teamA.forEach(function(pa) {
      match.teamB.forEach(function(pb) {
        App.Courts._updatePairStats(pa, pb, 'opponent');
      });
    });

    // Check "play together" wishes
    this._checkWishes(match.teamA);
    this._checkWishes(match.teamB);

    // Free up the court
    court.occupied = false;
    court.currentMatch = null;
    court.gameStartTime = null;

    // Players go to end of queue
    App.Queue.addMultipleToEnd(allPlayers);

    App.save();
    App.UI.showToast(App.t('gameFinishedOn') + court.displayNumber + App.t('gameFinishedSuffix'));
  },

  cancelGame: function(courtId) {
    var court = App.state.courts[courtId];
    if (!court || !court.currentMatch) return;

    var match = App.state.matches[court.currentMatch];
    if (!match) return;

    match.status = 'cancelled';
    match.endTime = Date.now();

    // Return players to front of queue
    var allPlayers = match.teamA.concat(match.teamB);
    allPlayers.reverse().forEach(function(pid) {
      App.Queue.remove(pid);
      App.state.waitingQueue.unshift(pid);
    });

    court.occupied = false;
    court.currentMatch = null;
    court.gameStartTime = null;

    App.save();
    App.UI.showToast(App.t('gameCancelled'));
  },

  _updatePairStats: function(id1, id2, type) {
    var p1 = App.state.players[id1];
    var p2 = App.state.players[id2];
    if (!p1 || !p2) return;

    if (type === 'partner') {
      if (!p1.partnerHistory) p1.partnerHistory = {};
      if (!p2.partnerHistory) p2.partnerHistory = {};
      p1.partnerHistory[id2] = (p1.partnerHistory[id2] || 0) + 1;
      p2.partnerHistory[id1] = (p2.partnerHistory[id1] || 0) + 1;
    } else {
      if (!p1.opponentHistory) p1.opponentHistory = {};
      if (!p2.opponentHistory) p2.opponentHistory = {};
      p1.opponentHistory[id2] = (p1.opponentHistory[id2] || 0) + 1;
      p2.opponentHistory[id1] = (p2.opponentHistory[id1] || 0) + 1;
    }
  },

  _checkWishes: function(teamIds) {
    teamIds.forEach(function(pid) {
      var p = App.state.players[pid];
      if (!p || !Array.isArray(p.wishedPartners)) return;
      p.wishedPartners.forEach(function(wishId) {
        if (teamIds.indexOf(wishId) !== -1 && p.wishesFulfilled.indexOf(wishId) === -1) {
          p.wishesFulfilled.push(wishId);
        }
      });
    });
  },

  getAvailable: function() {
    return Object.values(App.state.courts).filter(function(c) {
      return c.active && !c.occupied;
    });
  },

  getGameDuration: function(courtId) {
    var court = App.state.courts[courtId];
    if (!court || !court.gameStartTime) return 0;
    return Date.now() - court.gameStartTime;
  }
};

// ============================================================
// MATCHES — Match history
// ============================================================
App.Matches = {
  getFinished: function() {
    return Object.values(App.state.matches)
      .filter(function(m) { return m.status === 'finished'; })
      .sort(function(a, b) { return b.endTime - a.endTime; });
  },

  getFiltered: function(courtFilter, playerFilter) {
    var matches = this.getFinished();
    if (courtFilter && courtFilter !== 'all') {
      matches = matches.filter(function(m) { return m.courtId === courtFilter; });
    }
    if (playerFilter && playerFilter !== 'all') {
      matches = matches.filter(function(m) {
        return m.teamA.indexOf(playerFilter) !== -1 || m.teamB.indexOf(playerFilter) !== -1;
      });
    }
    return matches;
  },

  undoLast: function() {
    var finished = this.getFinished();
    if (finished.length === 0) {
      App.UI.showToast(App.t('noFinishedMatches'));
      return;
    }

    var last = finished[0]; // most recent
    var allPlayers = last.teamA.concat(last.teamB);

    // Revert stats
    allPlayers.forEach(function(pid) {
      var p = App.state.players[pid];
      if (!p) return;
      if (p.gamesPlayed > 0) p.gamesPlayed--;
    });

    // Revert partner history
    this._undoPairStats(last.teamA[0], last.teamA[1], 'partner');
    this._undoPairStats(last.teamB[0], last.teamB[1], 'partner');
    last.teamA.forEach(function(pa) {
      last.teamB.forEach(function(pb) {
        App.Matches._undoPairStats(pa, pb, 'opponent');
      });
    });

    // Delete match
    delete App.state.matches[last.id];

    // Remove players from queue (they were added at end on finish)
    allPlayers.forEach(function(pid) {
      App.Queue.remove(pid);
    });

    // Return to front of queue
    allPlayers.reverse().forEach(function(pid) {
      App.state.waitingQueue.unshift(pid);
    });

    App.save();
    App.UI.renderAll();
    App.UI.showToast(App.t('lastMatchUndone'));
  },

  _undoPairStats: function(id1, id2, type) {
    var p1 = App.state.players[id1];
    var p2 = App.state.players[id2];
    if (!p1 || !p2) return;

    var h1 = type === 'partner' ? p1.partnerHistory : p1.opponentHistory;
    var h2 = type === 'partner' ? p2.partnerHistory : p2.opponentHistory;

    if (h1[id2]) { h1[id2]--; if (h1[id2] <= 0) delete h1[id2]; }
    if (h2[id1]) { h2[id1]--; if (h2[id1] <= 0) delete h2[id1]; }
  }
};

// ============================================================
// SUGGEST — Lineup suggestion algorithm
// ============================================================
App.Suggest = {
  forCourt: function(courtId) {
    var queue = App.state.waitingQueue;
    var players = App.state.players;

    // Only present players from queue
    var candidates = queue
      .map(function(id) { return players[id]; })
      .filter(function(p) { return p && p.present; });

    if (candidates.length < 4) {
      return {
        players: null,
        explanation: App.t('notEnoughPlayers') + candidates.length + App.t('notEnoughPlayersSuffix')
      };
    }

    // Step 1: score each candidate
    var avgGames = this._averageGames();
    var scored = candidates.map(function(player, queueIndex) {
      var score = 0;
      var reasons = [];

      // Queue position is the main factor
      score += queueIndex * 100;

      // Penalty for games above average
      var gamesDiff = player.gamesPlayed - avgGames;
      if (gamesDiff > 0) {
        score += gamesDiff * 50;
      }

      // Bonus for unfulfilled wishes
      if (Array.isArray(player.wishedPartners)) {
        player.wishedPartners.forEach(function(wishId) {
          if (player.wishesFulfilled.indexOf(wishId) === -1) {
            var partner = players[wishId];
            if (partner && partner.present) {
              score -= 80;
              reasons.push(App.t('wantsPlayWith') + partner.name);
            }
          }
        });
      }

      return { player: player, score: score, reasons: reasons, queueIndex: queueIndex };
    });

    // Sort by score
    scored.sort(function(a, b) { return a.score - b.score; });

    // Step 2: pick top 4, try to include wished partner
    var selected = scored.slice(0, 4);

    for (var i = 0; i < Math.min(4, selected.length); i++) {
      var sel = selected[i];
      if (!Array.isArray(sel.player.wishedPartners)) continue;
      var unfulfilled = sel.player.wishedPartners.filter(function(wid) {
        return sel.player.wishesFulfilled.indexOf(wid) === -1;
      });
      for (var w = 0; w < unfulfilled.length; w++) {
        var wishId = unfulfilled[w];
        var alreadyIn = selected.some(function(s) { return s.player.id === wishId; });
        if (!alreadyIn) {
          var wishCandidate = scored.find(function(s) {
            return s.player.id === wishId && selected.indexOf(s) === -1;
          });
          if (wishCandidate && wishCandidate.queueIndex < candidates.length * 0.75) {
            selected[3] = wishCandidate;
            selected.sort(function(a, b) { return a.score - b.score; });
            break;
          }
        }
      }
    }

    var fourPlayers = selected.map(function(s) { return s.player; });

    // Step 3: best team split
    var split = this.splitTeams(fourPlayers);

    // Step 4: explanation
    var explanation = this._buildExplanation(selected, split, fourPlayers);

    return {
      players: fourPlayers.map(function(p) { return p.id; }),
      teamA: split.teamA,
      teamB: split.teamB,
      explanation: explanation,
      allSplits: split.allSplits
    };
  },

  // Split 4 players into 2 teams, choosing the best option
  splitTeams: function(fourPlayers) {
    var ids = fourPlayers.map(function(p) { return p.id; });
    var a = ids[0], b = ids[1], c = ids[2], d = ids[3];

    // 3 possible splits
    var splits = [
      { teamA: [a, b], teamB: [c, d] },
      { teamA: [a, c], teamB: [b, d] },
      { teamA: [a, d], teamB: [b, c] }
    ];

    var self = this;
    var scoredSplits = splits.map(function(split) {
      var penalty = 0;
      var reasons = [];

      // Penalty for pair repeats
      [split.teamA, split.teamB].forEach(function(team) {
        var count = self._pairCount(team[0], team[1]);
        if (count > 0) {
          penalty += count * 30;
          var n0 = App.state.players[team[0]].name;
          var n1 = App.state.players[team[1]].name;
          reasons.push(n0 + ' + ' + n1 + App.t('alreadyPaired') + count + App.t('timesN'));
        }
      });

      // Penalty for opponent repeats
      split.teamA.forEach(function(pa) {
        split.teamB.forEach(function(pb) {
          var count = self._opponentCount(pa, pb);
          if (count > 1) {
            penalty += (count - 1) * 15;
          }
        });
      });

      // Bonus for "play together" wish
      [split.teamA, split.teamB].forEach(function(team) {
        var p0 = App.state.players[team[0]];
        var p1 = App.state.players[team[1]];
        var p0Wants = Array.isArray(p0.wishedPartners) && p0.wishedPartners.indexOf(p1.id) !== -1 && p0.wishesFulfilled.indexOf(p1.id) === -1;
        var p1Wants = Array.isArray(p1.wishedPartners) && p1.wishedPartners.indexOf(p0.id) !== -1 && p1.wishesFulfilled.indexOf(p0.id) === -1;
        if (p0Wants || p1Wants) {
          penalty -= 100;
          reasons.push(App.t('wishLabel') + p0.name + ' + ' + p1.name);
        }
      });

      return {
        teamA: split.teamA,
        teamB: split.teamB,
        penalty: penalty,
        reasons: reasons,
        label: self._splitLabel(split)
      };
    });

    scoredSplits.sort(function(a, b) { return a.penalty - b.penalty; });

    return {
      teamA: scoredSplits[0].teamA,
      teamB: scoredSplits[0].teamB,
      reasons: scoredSplits[0].reasons,
      allSplits: scoredSplits
    };
  },

  _splitLabel: function(split) {
    var nameA = split.teamA.map(function(id) { return App.state.players[id].name; }).join(' + ');
    var nameB = split.teamB.map(function(id) { return App.state.players[id].name; }).join(' + ');
    return nameA + '  vs  ' + nameB;
  },

  _pairCount: function(id1, id2) {
    var p = App.state.players[id1];
    return p ? (p.partnerHistory[id2] || 0) : 0;
  },

  _opponentCount: function(id1, id2) {
    var p = App.state.players[id1];
    return p ? (p.opponentHistory[id2] || 0) : 0;
  },

  _averageGames: function() {
    var present = App.Players.getPresent();
    if (present.length === 0) return 0;
    var total = present.reduce(function(s, p) { return s + p.gamesPlayed; }, 0);
    return total / present.length;
  },

  _buildExplanation: function(selected, split, fourPlayers) {
    var lines = [];
    var names = fourPlayers.map(function(p) { return p.number + ' ' + p.name; });
    lines.push(App.t('selectedPlayers') + names.join(', '));

    // Reason for selection
    var allInQueueOrder = selected.every(function(s, i) {
      return i === 0 || s.queueIndex >= selected[i-1].queueIndex;
    });
    if (allInQueueOrder && selected[0].queueIndex === 0) {
      lines.push(App.t('firstInQueue'));
    }

    // Wishes
    selected.forEach(function(s) {
      if (s.reasons.length > 0) {
        lines.push(s.player.name + ': ' + s.reasons.join(', '));
      }
    });

    // Split reasons
    if (split.reasons && split.reasons.length > 0) {
      split.reasons.forEach(function(r) { lines.push(r); });
    }

    return lines.join('\n');
  }
};

// ============================================================
// SYNC — Firebase Realtime Database
// ============================================================
App.Sync = {
  db: null,
  ref: null,
  connected: false,
  _listener: null,
  _pushing: false,

  init: function(sessionId, asAdmin) {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined' || !firebase.database) {
      App.UI.showToast(App.t('firebaseNotLoaded'));
      return false;
    }

    // Initialize Firebase (if not already)
    if (!firebase.apps.length) {
      // Check config is filled in (loaded from firebase-config.js)
      if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.databaseURL) {
        App.UI.showToast(App.t('configureFirebase'));
        return false;
      }
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    this.db = firebase.database();
    this.ref = this.db.ref('sessions/' + sessionId);

    App.state.settings.syncEnabled = true;
    App.state.settings.syncSessionId = sessionId;
    App.state.isAdmin = !!asAdmin;

    var self = this;
    this._initialLoad = true;

    // Listen for changes
    this._listener = this.ref.on('value', function(snapshot) {
      if (self._pushing) return; // ignore own changes

      var remote = snapshot.val();
      if (self._initialLoad) {
        // First load: non-admin always takes remote state
        self._initialLoad = false;
        if (remote && !asAdmin) {
          self._merge(remote);
          App.UI.renderAll();
          return;
        }
      }

      if (remote && remote.lastModified > App.state.lastModified) {
        self._merge(remote);
        App.UI.renderAll();
      }
    });

    this.connected = true;
    this._updateStatus('connected');

    // If admin — push current state
    if (asAdmin) {
      this.push();
    }

    App.Storage.save(); // save locally only, don't push to Firebase
    return true;
  },

  push: function() {
    if (!this.ref || !this.connected) return;
    this._pushing = true;
    var self = this;
    this.ref.set(App.state).then(function() {
      self._pushing = false;
    }).catch(function(err) {
      self._pushing = false;
      console.error('Sync push error:', err);
    });
  },

  _merge: function(remote) {
    // Preserve local data that should not be overwritten
    var localIsAdmin = App.state.isAdmin;
    App.state = App.Storage._ensureState(remote);
    App.state.isAdmin = localIsAdmin;
    App.Storage.save();
  },

  disconnect: function() {
    if (this._listener && this.ref) {
      this.ref.off('value', this._listener);
    }
    this.connected = false;
    this._listener = null;
    App.state.settings.syncEnabled = false;
    App.state.settings.syncSessionId = null;
    App.save();
    this._updateStatus('disconnected');
  },

  _updateStatus: function(status) {
    var el = document.getElementById('syncStatus');
    var indicator = document.getElementById('syncIndicator');
    var btnDisconnect = document.getElementById('btnDisconnect');

    if (status === 'connected') {
      el.textContent = App.t('connectedToSession') + App.state.settings.syncSessionId;
      el.className = 'sync-status connected';
      indicator.hidden = false;
      indicator.className = 'sync-indicator';
      btnDisconnect.hidden = false;
    } else {
      el.textContent = App.t('disconnectedMsg');
      el.className = 'sync-status';
      indicator.hidden = true;
      btnDisconnect.hidden = true;
    }
  }
};

// ============================================================
// SAVE — Wrapper for save + sync
// ============================================================
App.save = function() {
  App.Storage.save();
  if (App.state.settings.syncEnabled && App.Sync.connected) {
    App.Sync.push();
  }
};

// ============================================================
// UI — Interface rendering
// ============================================================
App.UI = {
  currentTab: 'board',
  timerInterval: null,

  init: function() {
    this._bindTabs();
    this._bindDashboard();
    this._bindPlayers();
    this._bindCourts();
    this._bindHistory();
    this._bindSync();
    this._bindDebug();
    this._bindModeToggle();
    this._bindHelp();
    this.startTimers();
  },

  // --- Tabs ---
  _bindTabs: function() {
    var self = this;
    document.getElementById('tabNav').addEventListener('click', function(e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      self.showTab(tab.dataset.tab);
    });
  },

  showTab: function(tabName) {
    this.currentTab = tabName;
    App.Analytics.track('tab_switch', { tab_name: tabName });

    // Active tab
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    // Active panel
    document.querySelectorAll('.panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'panel-' + tabName);
    });

    // Render current tab
    this.renderCurrentTab();
  },

  renderCurrentTab: function() {
    switch (this.currentTab) {
      case 'board': this.renderBoard(); break;
      case 'dashboard': this.renderDashboard(); break;
      case 'players': this.renderPlayers(); break;
      case 'queue': this.renderQueue(); break;
      case 'courts': this.renderCourts(); break;
      case 'history': this.renderHistory(); break;
      case 'results': this.renderResults(); break;
      case 'sync': this.renderSync(); break;
      case 'debug': this.renderDebug(); break;
    }
  },

  renderAll: function() {
    this.renderSessionDate();
    this.renderCurrentTab();
  },

  renderSessionDate: function() {
    var el = document.getElementById('sessionDate');
    if (App.state) {
      el.textContent = App.Utils.formatDate(App.state.date) + ', ' + App.state.dayName;
    }
  },

  // --- Dashboard ---
  _bindDashboard: function() {
    var self = this;
    document.getElementById('btnNewSession').addEventListener('click', function() {
      self.showConfirm(App.t('confirmNewSession'), function() {
        App.Session.create();
        App.Session.initCourts([1, 2, 3, 4]);
        App.Analytics.track('session_create', { court_count: 4 });
        App.UI.renderAll();
        App.UI.showToast(App.t('newSessionCreated'));
      });
    });

    document.getElementById('btnResetToday').addEventListener('click', function() {
      self.showConfirm(App.t('confirmResetDay'), function() {
        App.Session.resetToday();
      });
    });

    document.getElementById('btnExport').addEventListener('click', function() {
      App.Storage.exportJSON();
    });

    document.getElementById('btnImport').addEventListener('click', function() {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', function(e) {
      if (e.target.files.length) {
        App.Storage.importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });

    document.getElementById('btnApplyCourts').addEventListener('click', function() {
      var input = document.getElementById('courtNumbers').value;
      var numbers = input.split(',').map(function(s) { return parseInt(s.trim()); }).filter(function(n) { return !isNaN(n) && n > 0; });
      if (numbers.length === 0) {
        App.UI.showToast(App.t('enterCourtNumbers'));
        return;
      }
      if (numbers.length > 5) {
        App.UI.showToast(App.t('maxCourts'));
        return;
      }
      App.Session.initCourts(numbers);
      App.save();
      App.UI.renderAll();
      App.UI.showToast(App.t('courtsUpdated') + numbers.join(', '));
    });
  },

  renderDashboard: function() {
    var present = App.Players.getPresent();
    var playing = present.filter(function(p) { return App.Players.isOnCourt(p.id); });
    var waiting = App.state.waitingQueue.length;
    var activeCourts = Object.values(App.state.courts).filter(function(c) { return c.active; });
    var occupiedCourts = activeCourts.filter(function(c) { return c.occupied; });
    var totalGames = App.Matches.getFinished().length;

    document.getElementById('statsGrid').innerHTML =
      '<div class="stat-card"><div class="stat-value">' + present.length + '</div><div class="stat-label">' + App.t('statPresent') + '</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + playing.length + '</div><div class="stat-label">' + App.t('statPlaying') + '</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + waiting + '</div><div class="stat-label">' + App.t('statInQueue') + '</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + occupiedCourts.length + '/' + activeCourts.length + '</div><div class="stat-label">' + App.t('statCourtsOccupied') + '</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + totalGames + '</div><div class="stat-label">' + App.t('statGamesPlayed') + '</div></div>';

    // Update court numbers in input
    var courtNums = Object.values(App.state.courts).map(function(c) { return c.displayNumber; });
    document.getElementById('courtNumbers').value = courtNums.join(',');
  },

  // --- Players ---
  _bindPlayers: function() {
    var self = this;

    document.getElementById('btnAddPlayer').addEventListener('click', function() {
      self._addPlayerFromInput();
    });

    document.getElementById('playerNameInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        self._addPlayerFromInput();
      }
    });

    // Event delegation for buttons in the list
    document.getElementById('playerList').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var row = btn.closest('[data-id]');
      if (!row) return;
      var playerId = row.dataset.id;
      var action = btn.dataset.action;

      switch (action) {
        case 'mark-present':
          App.Players.markPresent(playerId);
          App.Analytics.track('player_mark_present', { present_count: App.Players.getPresent().length });
          App.save();
          self.renderPlayers();
          self.renderQueue();
          break;
        case 'mark-absent':
          App.Players.markAbsent(playerId);
          App.save();
          self.renderPlayers();
          self.renderQueue();
          break;
        case 'add-to-queue':
          App.Queue.add(playerId);
          App.save();
          self.renderPlayers();
          self.renderQueue();
          break;
        case 'remove-from-queue':
          App.Queue.remove(playerId);
          App.save();
          self.renderPlayers();
          self.renderQueue();
          break;
        case 'set-wish':
          self._showWishDialog(playerId);
          break;
        case 'delete':
          self.showConfirm(App.t('confirmDeletePlayer') + App.state.players[playerId].name + App.t('confirmDeleteSuffix'), function() {
            App.Players.remove(playerId);
            App.save();
            self.renderPlayers();
            self.renderQueue();
          });
          break;
      }
    });
  },

  _addPlayerFromInput: function() {
    var input = document.getElementById('playerNameInput');
    var name = input.value.trim();
    if (!name) return;
    var id = App.Players.add(name);
    if (id) {
      App.Analytics.track('player_add', { player_count: Object.keys(App.state.players).length });
      input.value = '';
      input.focus();
      this.renderPlayers();
      App.UI.showToast(name + App.t('playerAdded'));
    }
  },

  renderPlayers: function() {
    var players = App.Players.getSorted();
    var html = '';

    players.forEach(function(p) {
      var status = App.Players.getStatus(p.id);
      var statusClass = 'status-' + (status === 'present' ? 'waiting' : status);
      var statusBadge = '';
      var queuePos = App.Queue.getPosition(p.id);

      switch (status) {
        case 'playing':
          var courtId = App.Players.getCourtId(p.id);
          var courtObj = courtId ? App.state.courts[courtId] : null;
          statusBadge = '<span class="player-status-badge playing">' + App.t('court') + (courtObj ? courtObj.displayNumber : '?') + '</span>';
          break;
        case 'waiting':
          statusBadge = '<span class="player-status-badge waiting">' + App.t('queuePos') + (queuePos + 1) + '</span>';
          break;
        case 'absent':
          statusBadge = '<span class="player-status-badge absent">' + App.t('absent') + '</span>';
          break;
        default:
          statusBadge = '<span class="player-status-badge absent">' + App.t('presentStatus') + '</span>';
      }

      var wishText = '';
      if (Array.isArray(p.wishedPartners) && p.wishedPartners.length > 0) {
        var wishParts = [];
        p.wishedPartners.forEach(function(wid) {
          var wp = App.state.players[wid];
          if (!wp) return;
          var fulfilled = Array.isArray(p.wishesFulfilled) && p.wishesFulfilled.indexOf(wid) !== -1;
          wishParts.push(
            (fulfilled ? '&#10003; ' : '&#9829; ') +
            wp.name +
            (fulfilled ? App.t('wishFulfilled') : '')
          );
        });
        if (wishParts.length > 0) {
          wishText = '<div class="player-wish">' + wishParts.join(', ') + '</div>';
        }
      }

      html += '<div class="player-row ' + statusClass + '" data-id="' + p.id + '">' +
        '<span class="player-number">' + (p.number || '-') + '</span>' +
        '<div class="player-info">' +
          '<span class="player-name">' + App.UI._esc(p.name) + '</span>' +
          wishText +
        '</div>' +
        '<span class="player-games">' + p.gamesPlayed + App.t('gamesN') + '</span>' +
        statusBadge +
        '<div class="player-actions">';

      if (!p.present) {
        html += '<button class="btn btn-success btn-xs" data-action="mark-present">' + App.t('arrived') + '</button>';
      } else {
        if (status !== 'playing') {
          html += '<button class="btn btn-secondary btn-xs" data-action="mark-absent">' + App.t('left') + '</button>';
        }
        if (status !== 'playing' && queuePos === -1) {
          html += '<button class="btn btn-warning btn-xs" data-action="add-to-queue">' + App.t('toQueue') + '</button>';
        }
        if (queuePos !== -1) {
          html += '<button class="btn btn-secondary btn-xs" data-action="remove-from-queue">' + App.t('fromQueue') + '</button>';
        }
      }

      html += '<button class="btn btn-secondary btn-xs" data-action="set-wish" title="' + App.t('wishPlayWith') + '" style="color:#e11d48">&#9829;</button>';
      if (status !== 'playing') {
        html += '<button class="btn btn-danger btn-xs" data-action="delete" title="' + App.t('deletePlayer') + '">&#10005;</button>';
      }

      html += '</div></div>';
    });

    if (players.length === 0) {
      html = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">' + App.t('addPlayersHint') + '</div>';
    }

    document.getElementById('playerList').innerHTML = html;
  },

  _showWishDialog: function(playerId) {
    var player = App.state.players[playerId];
    if (!player) return;
    if (!Array.isArray(player.wishedPartners)) player.wishedPartners = [];

    var present = App.Players.getPresent().filter(function(p) { return p.id !== playerId; });
    var html = '<h3>' + App.t('wishFor') + App.UI._esc(player.name) + '</h3>';
    html += '<p style="color:var(--text-secondary); font-size:13px; margin-bottom:12px;">' + App.t('selectPartner') + '</p>';
    html += '<div class="modal-player-list" id="wishPlayerList">';

    // "Clear all" option
    html += '<div class="modal-player-item' + (player.wishedPartners.length === 0 ? ' selected' : '') + '" data-wish-id="">' +
      '<span>' + App.t('noWish') + '</span></div>';

    present.forEach(function(p) {
      var selected = player.wishedPartners.indexOf(p.id) !== -1 ? ' selected' : '';
      html += '<div class="modal-player-item' + selected + '" data-wish-id="' + p.id + '">' +
        '<span style="font-weight:700; color:var(--primary); margin-right:6px;">' + (p.number || '-') + '</span>' +
        '<span>' + App.UI._esc(p.name) + '</span></div>';
    });

    html += '</div>';
    html += '<div class="btn-row"><button class="btn btn-secondary" onclick="App.UI.hideModal()">' + App.t('closeBtn') + '</button></div>';

    this.showModal(html);

    // Selection handler — multi-select toggle
    document.getElementById('modalContent').addEventListener('click', function(e) {
      var item = e.target.closest('.modal-player-item');
      if (!item) return;
      var wishId = item.dataset.wishId;

      if (!wishId) {
        // "No preference" — clear all
        App.Players.setWish(playerId, null);
        App.Analytics.track('wish_set', { wish_count: 0 });
        App.UI.showToast(App.t('wishRemoved'));
      } else {
        // Toggle this partner
        App.Players.setWish(playerId, wishId);
        var isNowWished = player.wishedPartners.indexOf(wishId) !== -1;
        App.Analytics.track('wish_set', { wish_count: player.wishedPartners.length });
        App.UI.showToast(isNowWished ? App.t('wishSet') : App.t('wishRemoved'));
      }

      // Update visual state without closing
      var list = document.getElementById('wishPlayerList');
      if (list) {
        var noWishItem = list.querySelector('[data-wish-id=""]');
        if (noWishItem) {
          noWishItem.classList.toggle('selected', player.wishedPartners.length === 0);
        }
        list.querySelectorAll('[data-wish-id]').forEach(function(el) {
          var wid = el.dataset.wishId;
          if (wid) {
            el.classList.toggle('selected', player.wishedPartners.indexOf(wid) !== -1);
          }
        });
      }

      App.UI.renderPlayers();
    });
  },

  // --- Queue ---
  renderQueue: function() {
    var queue = App.state.waitingQueue;
    var html = '';

    document.getElementById('queueCount').textContent = queue.length;

    queue.forEach(function(pid, idx) {
      var p = App.state.players[pid];
      if (!p) return;

      html += '<div class="queue-item" draggable="true" data-id="' + pid + '" data-index="' + idx + '">' +
        '<span class="drag-handle">&#9776;</span>' +
        '<span class="queue-pos">' + (idx + 1) + '</span>' +
        '<span class="queue-number">#' + (p.number || '?') + '</span>' +
        '<span class="queue-name">' + App.UI._esc(p.name) + '</span>' +
        '<span class="queue-wait">' + p.gamesPlayed + App.t('gamesN') + '</span>' +
        '<button class="btn btn-secondary btn-xs" data-action="queue-to-end" data-pid="' + pid + '">&darr;</button>' +
        '<button class="btn btn-danger btn-xs" data-action="queue-remove" data-pid="' + pid + '">&#10005;</button>' +
        '</div>';
    });

    if (queue.length === 0) {
      html = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">' + App.t('queueEmpty') + '</div>';
    }

    var queueList = document.getElementById('queueList');
    queueList.innerHTML = html;

    // Bind drag-and-drop and buttons
    App.DnD.init(queueList);
    this._bindQueueActions(queueList);
  },

  _bindQueueActions: function(container) {
    var self = this;
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var pid = btn.dataset.pid;
      if (!pid) return;

      switch (btn.dataset.action) {
        case 'queue-to-end':
          App.Queue.moveToEnd(pid);
          self.renderQueue();
          break;
        case 'queue-remove':
          App.Queue.remove(pid);
          App.save();
          self.renderQueue();
          self.renderPlayers();
          break;
      }
    });
  },

  // --- Courts (management) ---
  _bindCourts: function() {
    var self = this;

    document.getElementById('courtsGrid').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var card = btn.closest('[data-court-id]');
      if (!card) return;
      var courtId = card.dataset.courtId;

      switch (btn.dataset.action) {
        case 'suggest':
          self._suggestForCourt(courtId);
          break;
        case 'select-players':
          self._showPlayerSelectForCourt(courtId);
          break;
        case 'finish':
          self._showFinishConfirm(courtId);
          break;
        case 'cancel':
          self.showConfirm(App.t('confirmCancelGame'), function() {
            App.Analytics.track('game_cancel');
            App.Courts.cancelGame(courtId);
            App.UI.renderAll();
          });
          break;
      }
    });
  },

  renderCourts: function() {
    var courts = Object.values(App.state.courts).sort(function(a, b) {
      return a.displayNumber - b.displayNumber;
    });

    var html = '';
    courts.forEach(function(court) {
      var match = court.currentMatch ? App.state.matches[court.currentMatch] : null;
      var isOccupied = court.occupied && match && match.status === 'playing';

      html += '<div class="court-card ' + (isOccupied ? 'occupied' : 'free') + '" data-court-id="' + court.id + '">';
      html += '<div class="court-header">';
      html += '<h3>' + App.t('court') + court.displayNumber + '</h3>';

      if (isOccupied) {
        html += '<span class="court-timer" data-start="' + court.gameStartTime + '">' +
          App.Utils.formatTime(Date.now() - court.gameStartTime) + '</span>';
      }
      html += '</div>';

      if (isOccupied) {
        html += App.UI._renderTeams(match);
        html += '<div class="court-actions">';
        html += '<button class="btn btn-success" data-action="finish">' + App.t('finish') + '</button>';
        html += '<button class="btn btn-danger btn-sm" data-action="cancel">' + App.t('cancel') + '</button>';
        html += '</div>';

        // Hints
        html += App.UI._renderCourtHints(match);
      } else {
        html += '<div class="court-empty">' + App.t('courtFree') + '</div>';
        html += '<div class="court-actions">';
        html += '<button class="btn btn-primary" data-action="suggest">' + App.t('suggestLineup') + '</button>';
        html += '<button class="btn btn-secondary" data-action="select-players">' + App.t('selectManually') + '</button>';
        html += '</div>';
      }

      html += '</div>';
    });

    document.getElementById('courtsGrid').innerHTML = html;
  },

  _renderTeams: function(match) {
    var html = '<div class="court-teams">';
    html += '<div class="team team-a">';
    match.teamA.forEach(function(pid) {
      var p = App.state.players[pid];
      html += '<span><strong>#' + (p ? p.number : '?') + '</strong> ' + (p ? App.UI._esc(p.name) : '?') + '</span>';
    });
    html += '</div>';
    html += '<div class="vs">vs</div>';
    html += '<div class="team team-b">';
    match.teamB.forEach(function(pid) {
      var p = App.state.players[pid];
      html += '<span><strong>#' + (p ? p.number : '?') + '</strong> ' + (p ? App.UI._esc(p.name) : '?') + '</span>';
    });
    html += '</div></div>';
    return html;
  },

  _renderCourtHints: function(match) {
    var hints = [];

    // Check pair repeats
    [match.teamA, match.teamB].forEach(function(team) {
      var count = App.Suggest._pairCount(team[0], team[1]);
      if (count > 1) {
        var n0 = App.state.players[team[0]];
        var n1 = App.state.players[team[1]];
        hints.push({ type: 'warn', text: (n0 ? n0.name : '?') + ' + ' + (n1 ? n1.name : '?') + App.t('alreadyPaired') + count + App.t('timesN') });
      }
    });

    // Check wishes
    [match.teamA, match.teamB].forEach(function(team) {
      var p0 = App.state.players[team[0]];
      var p1 = App.state.players[team[1]];
      if (p0 && p1) {
        var p0w = Array.isArray(p0.wishedPartners) && p0.wishedPartners.indexOf(p1.id) !== -1;
        var p1w = Array.isArray(p1.wishedPartners) && p1.wishedPartners.indexOf(p0.id) !== -1;
        if (p0w || p1w) {
          hints.push({ type: 'good', text: App.t('wishLabel') + p0.name + ' + ' + p1.name });
        }
      }
    });

    if (hints.length === 0) return '';
    var html = '<div class="court-hints">';
    hints.forEach(function(h) {
      html += '<div class="hint-' + h.type + '">' + h.text + '</div>';
    });
    html += '</div>';
    return html;
  },

  _suggestForCourt: function(courtId) {
    App.Analytics.track('game_suggest', { court_id: courtId });
    var result = App.Suggest.forCourt(courtId);

    if (!result.players) {
      App.UI.showToast(result.explanation);
      return;
    }

    // Show suggestion modal
    var html = '<h3>' + App.t('suggestionFor') + App.state.courts[courtId].displayNumber + '</h3>';
    html += '<div class="suggestion-block">';
    html += '<div class="suggestion-explanation">' + App.UI._esc(result.explanation) + '</div>';
    html += '</div>';

    // Split options
    html += '<h4 style="margin-top:14px;">' + App.t('teamSplit') + '</h4>';
    html += '<div class="team-split-options">';

    var selectedSplit = { teamA: result.teamA, teamB: result.teamB };

    result.allSplits.forEach(function(split, idx) {
      var isSelected = idx === 0;
      html += '<div class="team-split-option' + (isSelected ? ' selected' : '') + '" data-split-idx="' + idx + '">';
      html += '<strong>' + split.label + '</strong>';
      if (split.reasons.length > 0) {
        html += '<div style="font-size:11px; color:var(--text-secondary);">' + split.reasons.join('; ') + '</div>';
      }
      html += '</div>';
    });

    // Custom split option
    html += '<div class="team-split-option" data-split-idx="custom">';
    html += '<strong>' + App.t('customSplit') + '</strong>';
    html += '</div>';

    html += '</div>';

    // Custom split area
    html += App.UI._buildCustomSplitHtml(result.teamA, result.teamB);

    html += '<div class="btn-row">';
    html += '<button class="btn btn-success" id="btnConfirmSuggest">' + App.t('startGame') + '</button>';
    html += '<button class="btn btn-secondary" onclick="App.UI.hideModal()">' + App.t('cancelAction') + '</button>';
    html += '</div>';

    this.showModal(html);

    var customArea = document.getElementById('customSplitArea');
    var isCustom = false;

    // Split selection
    document.getElementById('modalContent').addEventListener('click', function(e) {
      var option = e.target.closest('.team-split-option');
      if (option) {
        document.querySelectorAll('.team-split-option').forEach(function(o) { o.classList.remove('selected'); });
        option.classList.add('selected');
        var idx = option.dataset.splitIdx;
        if (idx === 'custom') {
          isCustom = true;
          customArea.classList.add('active');
          App.UI._syncCustomSplit(customArea, selectedSplit);
        } else {
          isCustom = false;
          customArea.classList.remove('active');
          selectedSplit = result.allSplits[parseInt(idx)];
        }
      }

      // Handle chip clicks in custom area
      var chip = e.target.closest('.custom-split-chip');
      if (chip && isCustom) {
        App.UI._handleCustomChipClick(chip, customArea, selectedSplit);
      }
    });

    // Confirm
    document.getElementById('btnConfirmSuggest').addEventListener('click', function() {
      App.Analytics.track('game_start', { split_type: isCustom ? 'custom' : 'suggested', source: 'suggest' });
      App.Courts.startGame(courtId, selectedSplit.teamA, selectedSplit.teamB);
      App.UI.hideModal();
      App.UI.renderAll();
    });
  },

  _buildCustomSplitHtml: function(teamA, teamB) {
    // Gather bench players: present, not on court, not in teamA/teamB
    var onTeam = teamA.concat(teamB);
    var bench = App.state.waitingQueue.filter(function(id) {
      return onTeam.indexOf(id) === -1 && !App.Players.isOnCourt(id);
    });
    // Also add present players not in queue and not on court
    App.Players.getPresent().forEach(function(p) {
      if (onTeam.indexOf(p.id) === -1 && bench.indexOf(p.id) === -1 && !App.Players.isOnCourt(p.id)) {
        bench.push(p.id);
      }
    });

    var html = '<div class="custom-split-area" id="customSplitArea">';
    html += '<div class="custom-split-teams">';
    html += '<div class="custom-split-team custom-split-team-a" id="customTeamA">';
    html += '<h5>Team A</h5>';
    teamA.forEach(function(id) {
      html += '<span class="custom-split-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
    });
    html += '</div>';
    html += '<div class="custom-split-team custom-split-team-b" id="customTeamB">';
    html += '<h5>Team B</h5>';
    teamB.forEach(function(id) {
      html += '<span class="custom-split-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
    });
    html += '</div>';
    html += '</div>';
    if (bench.length > 0) {
      html += '<div class="custom-split-bench" id="customBench">';
      html += '<h5>' + App.t('customBench') + '</h5>';
      bench.forEach(function(id) {
        html += '<span class="custom-split-chip bench-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
      });
      html += '</div>';
    }
    html += '<div class="custom-split-hint">' + App.t('customSplitHint') + '</div>';
    html += '</div>';
    return html;
  },

  _syncCustomSplit: function(area, splitObj) {
    var teamAEl = area.querySelector('#customTeamA') || area.querySelector('.custom-split-team-a');
    var teamBEl = area.querySelector('#customTeamB') || area.querySelector('.custom-split-team-b');
    var benchEl = area.querySelector('#customBench') || area.querySelector('.custom-split-bench');
    teamAEl.innerHTML = '<h5>Team A</h5>';
    teamBEl.innerHTML = '<h5>Team B</h5>';
    splitObj.teamA.forEach(function(id) {
      teamAEl.innerHTML += '<span class="custom-split-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
    });
    splitObj.teamB.forEach(function(id) {
      teamBEl.innerHTML += '<span class="custom-split-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
    });
    if (benchEl) {
      var onTeam = splitObj.teamA.concat(splitObj.teamB);
      var bench = App.state.waitingQueue.filter(function(id) {
        return onTeam.indexOf(id) === -1 && !App.Players.isOnCourt(id);
      });
      App.Players.getPresent().forEach(function(p) {
        if (onTeam.indexOf(p.id) === -1 && bench.indexOf(p.id) === -1 && !App.Players.isOnCourt(p.id)) {
          bench.push(p.id);
        }
      });
      benchEl.innerHTML = '<h5>' + App.t('customBench') + '</h5>';
      bench.forEach(function(id) {
        benchEl.innerHTML += '<span class="custom-split-chip bench-chip" data-pid="' + id + '">' + App.UI._esc(App.state.players[id].name) + '</span>';
      });
      benchEl.style.display = bench.length > 0 ? '' : 'none';
    }
  },

  _customSwapTarget: null,

  _handleCustomChipClick: function(chip, area, splitObj) {
    var pid = chip.dataset.pid;
    var inA = splitObj.teamA.indexOf(pid) !== -1;
    var inB = splitObj.teamB.indexOf(pid) !== -1;
    var onBench = !inA && !inB;

    if (this._customSwapTarget) {
      var first = this._customSwapTarget;
      var firstInA = splitObj.teamA.indexOf(first) !== -1;
      var firstInB = splitObj.teamB.indexOf(first) !== -1;
      var firstOnBench = !firstInA && !firstInB;

      var swapped = false;

      if (firstInA && inB) {
        // Swap between Team A and Team B
        splitObj.teamA[splitObj.teamA.indexOf(first)] = pid;
        splitObj.teamB[splitObj.teamB.indexOf(pid)] = first;
        swapped = true;
      } else if (firstInB && inA) {
        splitObj.teamB[splitObj.teamB.indexOf(first)] = pid;
        splitObj.teamA[splitObj.teamA.indexOf(pid)] = first;
        swapped = true;
      } else if (firstInA && onBench) {
        // Replace team A player with bench player
        splitObj.teamA[splitObj.teamA.indexOf(first)] = pid;
        swapped = true;
      } else if (firstInB && onBench) {
        // Replace team B player with bench player
        splitObj.teamB[splitObj.teamB.indexOf(first)] = pid;
        swapped = true;
      } else if (firstOnBench && inA) {
        // Replace team A player with bench player
        splitObj.teamA[splitObj.teamA.indexOf(pid)] = first;
        swapped = true;
      } else if (firstOnBench && inB) {
        // Replace team B player with bench player
        splitObj.teamB[splitObj.teamB.indexOf(pid)] = first;
        swapped = true;
      }

      this._customSwapTarget = null;
      area.querySelectorAll('.custom-split-chip').forEach(function(c) { c.classList.remove('swap-selected'); });
      if (swapped) {
        var swapType = (firstOnBench || onBench) ? 'bench' : 'team';
        App.Analytics.track('custom_split_swap', { swap_type: swapType });
        this._syncCustomSplit(area, splitObj);
      }
    } else {
      // First click — highlight and wait for second
      this._customSwapTarget = pid;
      area.querySelectorAll('.custom-split-chip').forEach(function(c) { c.classList.remove('swap-selected'); });
      chip.classList.add('swap-selected');
    }
  },

  _showPlayerSelectForCourt: function(courtId) {
    var queue = App.state.waitingQueue;
    var allPresent = App.Players.getPresent().filter(function(p) {
      return !App.Players.isOnCourt(p.id);
    });

    var selectedIds = [];

    var html = '<h3>' + App.t('selectPlayersFor') + App.state.courts[courtId].displayNumber + '</h3>';
    html += '<p style="color:var(--text-secondary); font-size:13px; margin-bottom:10px;">' + App.t('select4Players') + '</p>';
    html += '<div class="player-select-grid" id="playerSelectGrid">';

    allPresent.forEach(function(p) {
      var inQueue = queue.indexOf(p.id) !== -1;
      html += '<div class="player-select-item" data-pid="' + p.id + '">' +
        '<span class="ps-number">#' + (p.number || '?') + '</span> ' +
        App.UI._esc(p.name) +
        (inQueue ? '<div style="font-size:10px; color:var(--text-secondary);">' + App.t('inQueueLabel') + '</div>' : '') +
        '</div>';
    });

    html += '</div>';
    html += '<div id="selectedTeamsPreview" style="margin-top:12px;"></div>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-success" id="btnStartManual" disabled>' + App.t('startGame') + '</button>';
    html += '<button class="btn btn-secondary" onclick="App.UI.hideModal()">' + App.t('cancelAction') + '</button>';
    html += '</div>';

    this.showModal(html);

    var grid = document.getElementById('playerSelectGrid');
    var btnStart = document.getElementById('btnStartManual');
    var preview = document.getElementById('selectedTeamsPreview');
    var chosenSplit = null;

    grid.addEventListener('click', function(e) {
      var item = e.target.closest('.player-select-item');
      if (!item) return;
      var pid = item.dataset.pid;

      var idx = selectedIds.indexOf(pid);
      if (idx !== -1) {
        selectedIds.splice(idx, 1);
        item.classList.remove('selected');
      } else {
        if (selectedIds.length >= 4) {
          App.UI.showToast(App.t('already4Selected'));
          return;
        }
        selectedIds.push(pid);
        item.classList.add('selected');
      }

      btnStart.disabled = selectedIds.length !== 4;

      // Show split options when 4 selected
      if (selectedIds.length === 4) {
        var fourPlayers = selectedIds.map(function(id) { return App.state.players[id]; });
        var split = App.Suggest.splitTeams(fourPlayers);
        chosenSplit = { teamA: split.teamA, teamB: split.teamB };

        var phtml = '<h4>' + App.t('splitHeading') + '</h4><div class="team-split-options">';
        split.allSplits.forEach(function(s, i) {
          phtml += '<div class="team-split-option' + (i === 0 ? ' selected' : '') + '" data-sidx="' + i + '">' +
            '<strong>' + s.label + '</strong>';
          if (s.reasons.length > 0) {
            phtml += '<div style="font-size:11px; color:var(--text-secondary);">' + s.reasons.join('; ') + '</div>';
          }
          phtml += '</div>';
        });
        // Custom split option
        phtml += '<div class="team-split-option" data-sidx="custom">';
        phtml += '<strong>' + App.t('customSplit') + '</strong>';
        phtml += '</div>';
        phtml += '</div>';
        phtml += App.UI._buildCustomSplitHtml(split.teamA, split.teamB);
        preview.innerHTML = phtml;

        var customArea2 = document.getElementById('customSplitArea');
        var isCustom2 = false;

        // Split selection handler
        preview.addEventListener('click', function(e2) {
          var opt = e2.target.closest('.team-split-option');
          if (opt) {
            preview.querySelectorAll('.team-split-option').forEach(function(o) { o.classList.remove('selected'); });
            opt.classList.add('selected');
            var sidx = opt.dataset.sidx;
            if (sidx === 'custom') {
              isCustom2 = true;
              customArea2.classList.add('active');
              App.UI._syncCustomSplit(customArea2, chosenSplit);
            } else {
              isCustom2 = false;
              customArea2.classList.remove('active');
              chosenSplit = split.allSplits[parseInt(sidx)];
            }
          }

          // Handle chip clicks in custom area
          var chip = e2.target.closest('.custom-split-chip');
          if (chip && isCustom2) {
            App.UI._handleCustomChipClick(chip, customArea2, chosenSplit);
          }
        });
      } else {
        preview.innerHTML = '';
        chosenSplit = null;
      }
    });

    btnStart.addEventListener('click', function() {
      if (!chosenSplit) return;
      App.Analytics.track('game_start', { split_type: isCustom2 ? 'custom' : 'suggested', source: 'manual' });
      App.Courts.startGame(courtId, chosenSplit.teamA, chosenSplit.teamB);
      App.UI.hideModal();
      App.UI.renderAll();
    });
  },

  // --- Board ---
  renderBoard: function() {
    var courts = Object.values(App.state.courts).sort(function(a, b) {
      return a.displayNumber - b.displayNumber;
    });

    // Courts
    var html = '';
    courts.forEach(function(court) {
      var match = court.currentMatch ? App.state.matches[court.currentMatch] : null;
      var isOccupied = court.occupied && match && match.status === 'playing';

      html += '<div class="board-court-card ' + (isOccupied ? 'occupied' : 'free') + '" data-court-id="' + court.id + '">';
      html += '<div class="board-court-header">';
      html += '<h3>' + App.t('court') + court.displayNumber + '</h3>';
      if (isOccupied) {
        html += '<span class="board-court-timer" data-start="' + court.gameStartTime + '">' +
          App.Utils.formatTime(Date.now() - court.gameStartTime) + '</span>';
      }
      html += '</div>';

      if (isOccupied) {
        html += '<div class="board-court-teams">';
        html += '<div class="board-team board-team-a">';
        match.teamA.forEach(function(pid) {
          var p = App.state.players[pid];
          html += '<span><span class="board-player-num">#' + (p ? p.number : '?') + '</span> ' + (p ? App.UI._esc(p.name) : '?') + '</span>';
        });
        html += '</div>';
        html += '<div class="board-vs">vs</div>';
        html += '<div class="board-team board-team-b">';
        match.teamB.forEach(function(pid) {
          var p = App.state.players[pid];
          html += '<span><span class="board-player-num">#' + (p ? p.number : '?') + '</span> ' + (p ? App.UI._esc(p.name) : '?') + '</span>';
        });
        html += '</div></div>';

        html += '<div class="board-court-actions">';
        html += '<button class="btn btn-success" data-action="board-finish" data-court="' + court.id + '">' + App.t('boardFinish') + '</button>';
        html += '</div>';
      } else {
        html += '<div class="court-empty">' + App.t('boardFree') + '</div>';
        html += '<div class="board-court-actions">';
        html += '<button class="btn btn-primary" data-action="board-suggest" data-court="' + court.id + '">' + App.t('boardSuggest') + '</button>';
        html += '</div>';
      }

      html += '</div>';
    });

    document.getElementById('boardCourts').innerHTML = html;

    // Queue
    var queue = App.state.waitingQueue;
    document.getElementById('boardQueueCount').textContent = queue.length;

    var qhtml = '';
    queue.forEach(function(pid, idx) {
      var p = App.state.players[pid];
      if (!p) return;
      qhtml += '<div class="board-queue-item">' +
        '<span class="bq-pos">' + (idx + 1) + '.</span>' +
        '<span class="bq-number">#' + (p.number || '?') + '</span>' +
        '<span class="bq-name">' + App.UI._esc(p.name) + '</span>' +
        '</div>';
    });

    if (queue.length === 0) {
      qhtml = '<div style="text-align:center; color:var(--text-secondary); padding:12px;">' + App.t('queueEmpty') + '</div>';
    }

    document.getElementById('boardQueueList').innerHTML = qhtml;

    // Bind board action buttons
    this._bindBoardActions();
  },

  _bindBoardActions: function() {
    var self = this;
    document.getElementById('boardCourts').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var courtId = btn.dataset.court;

      switch (btn.dataset.action) {
        case 'board-finish':
          self._showFinishConfirm(courtId);
          break;
        case 'board-suggest':
          self._suggestForCourt(courtId);
          break;
      }
    });
  },

  // --- History ---
  _bindHistory: function() {
    var self = this;

    document.getElementById('historyCourtFilter').addEventListener('change', function() {
      self.renderHistory();
    });

    document.getElementById('historyPlayerFilter').addEventListener('change', function() {
      self.renderHistory();
    });

    document.getElementById('btnUndoLastMatch').addEventListener('click', function() {
      self.showConfirm(App.t('confirmUndoMatch'), function() {
        App.Matches.undoLast();
      });
    });
  },

  renderHistory: function() {
    // Update filters
    var courtSelect = document.getElementById('historyCourtFilter');
    var playerSelect = document.getElementById('historyPlayerFilter');

    // Save current values
    var currentCourt = courtSelect.value;
    var currentPlayer = playerSelect.value;

    // Update court options
    courtSelect.innerHTML = '<option value="all">' + App.t('allCourts') + '</option>';
    Object.values(App.state.courts).forEach(function(c) {
      courtSelect.innerHTML += '<option value="' + c.id + '"' +
        (currentCourt === c.id ? ' selected' : '') +
        '>' + App.t('court') + c.displayNumber + '</option>';
    });

    // Update player options
    playerSelect.innerHTML = '<option value="all">' + App.t('allPlayers') + '</option>';
    App.Players.getSorted().forEach(function(p) {
      playerSelect.innerHTML += '<option value="' + p.id + '"' +
        (currentPlayer === p.id ? ' selected' : '') +
        '>' + (p.number || '-') + '. ' + p.name + '</option>';
    });

    var matches = App.Matches.getFiltered(courtSelect.value, playerSelect.value);
    var html = '';

    matches.forEach(function(m) {
      var courtObj = App.state.courts[m.courtId];
      var teamANames = m.teamA.map(function(id) {
        var p = App.state.players[id];
        return p ? ('#' + p.number + ' ' + p.name) : '?';
      });
      var teamBNames = m.teamB.map(function(id) {
        var p = App.state.players[id];
        return p ? ('#' + p.number + ' ' + p.name) : '?';
      });

      html += '<div class="history-item">';
      html += '<div class="history-item-header">';
      html += '<span>' + App.t('court') + (courtObj ? courtObj.displayNumber : '?') + '</span>';
      html += '<span>' + App.Utils.formatTimestamp(m.startTime) + ' — ' + App.Utils.formatTimestamp(m.endTime) + '</span>';
      html += '</div>';
      html += '<div class="history-item-teams">';
      html += teamANames.join(' + ') + '  <strong>vs</strong>  ' + teamBNames.join(' + ');
      if (m.score) html += '  <span style="color:var(--primary);">' + m.score + '</span>';
      html += '</div></div>';
    });

    if (matches.length === 0) {
      html = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">' + App.t('noMatches') + '</div>';
    }

    document.getElementById('historyList').innerHTML = html;
  },

  // --- Sync ---
  // --- Results / Leaderboard ---
  renderResults: function() {
    var players = Object.values(App.state.players).filter(function(p) {
      return p.gamesPlayed > 0;
    });

    if (players.length === 0) {
      document.getElementById('resultsContent').innerHTML =
        '<div style="text-align:center; color:var(--text-secondary); padding:24px;">' + App.t('noResultsYet') + '</div>';
      return;
    }

    // Sort by wins desc, then win rate, then points diff
    players.sort(function(a, b) {
      var aWins = a.wins || 0, bWins = b.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      var aRate = a.gamesPlayed ? aWins / a.gamesPlayed : 0;
      var bRate = b.gamesPlayed ? bWins / b.gamesPlayed : 0;
      if (bRate !== aRate) return bRate - aRate;
      var aDiff = (a.pointsScored || 0) - (a.pointsConceded || 0);
      var bDiff = (b.pointsScored || 0) - (b.pointsConceded || 0);
      return bDiff - aDiff;
    });

    var html = '<table class="results-table">';
    html += '<thead><tr>';
    html += '<th>#</th>';
    html += '<th>' + App.t('resultsPlayer') + '</th>';
    html += '<th>' + App.t('resultsGames') + '</th>';
    html += '<th>W</th>';
    html += '<th>L</th>';
    html += '<th>' + App.t('resultsWinRate') + '</th>';
    html += '<th>' + App.t('resultsPoints') + '</th>';
    html += '<th>+/-</th>';
    html += '</tr></thead><tbody>';

    players.forEach(function(p, idx) {
      var wins = p.wins || 0;
      var losses = p.losses || 0;
      var rate = p.gamesPlayed ? Math.round(100 * wins / p.gamesPlayed) : 0;
      var diff = (p.pointsScored || 0) - (p.pointsConceded || 0);
      var diffStr = diff > 0 ? '+' + diff : '' + diff;
      var diffClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : '');
      var medal = idx === 0 ? ' results-gold' : (idx === 1 ? ' results-silver' : (idx === 2 ? ' results-bronze' : ''));

      html += '<tr class="' + medal + '">';
      html += '<td class="results-rank">' + (idx + 1) + '</td>';
      html += '<td class="results-name">' + App.UI._esc(p.name) + '</td>';
      html += '<td>' + p.gamesPlayed + '</td>';
      html += '<td class="results-wins">' + wins + '</td>';
      html += '<td class="results-losses">' + losses + '</td>';
      html += '<td>' + rate + '%</td>';
      html += '<td>' + (p.pointsScored || 0) + ':' + (p.pointsConceded || 0) + '</td>';
      html += '<td class="results-diff ' + diffClass + '">' + diffStr + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('resultsContent').innerHTML = html;
  },

  renderSync: function() {
    // Update share link visibility based on connection state
    var shareLinkEl = document.getElementById('syncShareLink');
    var disconnectBtn = document.getElementById('btnDisconnect');
    if (App.Sync.connected) {
      disconnectBtn.hidden = false;
      shareLinkEl.hidden = false;
      var url = this._buildShareUrl(App.state.settings.syncSessionId);
      document.getElementById('syncShareUrl').value = url;
    } else {
      disconnectBtn.hidden = true;
      shareLinkEl.hidden = true;
    }
  },

  _buildShareUrl: function(sessionId) {
    var base = window.location.href.split('?')[0].split('#')[0];
    return base + '?session=' + encodeURIComponent(sessionId);
  },

  _bindSync: function() {
    var self = this;

    document.getElementById('btnCreateSession').addEventListener('click', function() {
      var sessionId = document.getElementById('sessionIdInput').value.trim();
      if (!sessionId) {
        sessionId = 'badminton-' + App.state.date;
        document.getElementById('sessionIdInput').value = sessionId;
      }
      var ok = App.Sync.init(sessionId, true);
      if (ok) {
        App.Analytics.track('sync_create');
        App.UI.showToast(App.t('sessionCreated') + sessionId);
        self.renderSync();
      }
    });

    document.getElementById('btnJoinSession').addEventListener('click', function() {
      var sessionId = document.getElementById('sessionIdInput').value.trim();
      if (!sessionId) {
        App.UI.showToast(App.t('enterSessionId'));
        return;
      }
      var ok = App.Sync.init(sessionId, false);
      if (ok) {
        App.Analytics.track('sync_join', { source: 'manual' });
        App.UI.showToast(App.t('connectedToSession') + sessionId);
        self.renderSync();
      }
    });

    document.getElementById('btnDisconnect').addEventListener('click', function() {
      App.Sync.disconnect();
      App.UI.showToast(App.t('syncDisconnected'));
      self.renderSync();
    });

    document.getElementById('btnCopyLink').addEventListener('click', function() {
      var urlInput = document.getElementById('syncShareUrl');
      navigator.clipboard.writeText(urlInput.value).then(function() {
        App.UI.showToast(App.t('linkCopied'));
      });
    });
  },

  // --- Mode toggle ---
  // --- Finish game confirm ---
  _showFinishConfirm: function(courtId) {
    var court = App.state.courts[courtId];
    if (!court || !court.currentMatch) return;
    var match = App.state.matches[court.currentMatch];
    if (!match) return;

    var teamANames = match.teamA.map(function(pid) {
      var p = App.state.players[pid];
      return p ? App.UI._esc(p.name) : '?';
    }).join(' & ');
    var teamBNames = match.teamB.map(function(pid) {
      var p = App.state.players[pid];
      return p ? App.UI._esc(p.name) : '?';
    }).join(' & ');

    var html = '<h3>' + App.t('finishGameTitle') + ' ' + court.displayNumber + '</h3>';
    html += '<div class="finish-teams">';
    html += '<span class="finish-team-name">' + teamANames + '</span>';
    html += '<span class="finish-vs">vs</span>';
    html += '<span class="finish-team-name">' + teamBNames + '</span>';
    html += '</div>';
    html += '<div class="finish-score-row">';
    html += '<input type="number" id="finishScoreA" class="score-input" min="0" max="99" placeholder="0">';
    html += '<span class="finish-score-sep">:</span>';
    html += '<input type="number" id="finishScoreB" class="score-input" min="0" max="99" placeholder="0">';
    html += '</div>';
    html += '<p class="finish-hint">' + App.t('scoreOptional') + '</p>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-success" id="btnFinishConfirm">' + App.t('finishConfirm') + '</button>';
    html += '<button class="btn btn-secondary" id="btnFinishCancel">' + App.t('cancelAction') + '</button>';
    html += '</div>';

    this.showModal(html);

    document.getElementById('finishScoreA').focus();

    document.getElementById('btnFinishConfirm').addEventListener('click', function() {
      var scoreA = document.getElementById('finishScoreA').value.trim();
      var scoreB = document.getElementById('finishScoreB').value.trim();
      var score = null;
      if (scoreA && scoreB) {
        score = scoreA + '-' + scoreB;
      }
      var durationSec = Math.round((Date.now() - (App.state.courts[courtId].gameStartTime || Date.now())) / 1000);
      App.Analytics.track('game_finish', { has_score: !!score, duration_sec: durationSec });
      App.UI.hideModal();
      App.Courts.finishGame(courtId, score);
      App.UI.renderAll();
    });

    document.getElementById('btnFinishCancel').addEventListener('click', function() {
      App.UI.hideModal();
    });
  },

  // --- Debug ---
  renderDebug: function() {
    var s = App.state;

    // Session stats
    var playerCount = Object.keys(s.players).length;
    var presentCount = Object.values(s.players).filter(function(p) { return p.present; }).length;
    var queueCount = s.waitingQueue.length;
    var courtCount = Object.keys(s.courts).length;
    var occupiedCount = Object.values(s.courts).filter(function(c) { return c.occupied; }).length;
    var matchCount = Object.keys(s.matches).length;

    var statsHtml = '<table class="debug-table">' +
      '<tr><td>' + App.t('debugPlayers') + '</td><td><strong>' + playerCount + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugPresent') + '</td><td><strong>' + presentCount + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugInQueue') + '</td><td><strong>' + queueCount + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugCourts') + '</td><td><strong>' + courtCount + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugOccupied') + '</td><td><strong>' + occupiedCount + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugMatches') + '</td><td><strong>' + matchCount + '</strong></td></tr>' +
      '<tr><td>Version</td><td><strong>' + (s.version || '?') + '</strong></td></tr>' +
      '<tr><td>Date</td><td><strong>' + (s.date || '?') + '</strong></td></tr>' +
      '<tr><td>isAdmin</td><td><strong>' + s.isAdmin + '</strong></td></tr>' +
      '</table>';
    document.getElementById('debugStats').innerHTML = statsHtml;

    // Sync state
    var syncHtml;
    if (App.Sync.connected) {
      syncHtml = '<table class="debug-table">' +
        '<tr><td>Status</td><td><strong style="color:var(--success)">' + App.t('debugSyncOn') + '</strong></td></tr>' +
        '<tr><td>' + App.t('debugSyncSession') + '</td><td><strong>' + (s.settings.syncSessionId || '—') + '</strong></td></tr>' +
        '<tr><td>Firebase ref</td><td><code>' + (App.Sync.ref ? App.Sync.ref.toString() : '—') + '</code></td></tr>' +
        '</table>';
    } else {
      syncHtml = '<p style="color:var(--text-secondary)">' + App.t('debugSyncOff') + '</p>';
    }
    document.getElementById('debugSyncInfo').innerHTML = syncHtml;

    // LocalStorage info
    var keys = [];
    var totalSize = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      var val = localStorage.getItem(key);
      var size = val ? val.length : 0;
      totalSize += size;
      keys.push({ key: key, size: size });
    }
    keys.sort(function(a, b) { return b.size - a.size; });

    var storageHtml = '<table class="debug-table">' +
      '<tr><td>' + App.t('debugStorageKeys') + '</td><td><strong>' + keys.length + '</strong></td></tr>' +
      '<tr><td>' + App.t('debugStorageSize') + '</td><td><strong>' + this._formatBytes(totalSize) + '</strong></td></tr>' +
      '</table>';
    storageHtml += '<table class="debug-table debug-table-keys">';
    storageHtml += '<tr><th>Key</th><th>Size</th></tr>';
    keys.forEach(function(k) {
      storageHtml += '<tr><td><code>' + App.UI._esc(k.key) + '</code></td><td>' + App.UI._formatBytes(k.size) + '</td></tr>';
    });
    storageHtml += '</table>';
    document.getElementById('debugStorageInfo').innerHTML = storageHtml;

    // Current state JSON
    var stateJson = JSON.stringify(s, null, 2);
    document.getElementById('debugStateJson').textContent = stateJson;
  },

  _formatBytes: function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  _bindDebug: function() {
    var self = this;
    document.getElementById('btnClearStorage').addEventListener('click', function() {
      App.UI.showConfirm(App.t('debugConfirmClear'), function() {
        localStorage.clear();
        App.UI.showToast(App.t('debugCleared'));
        setTimeout(function() { window.location.reload(); }, 500);
      });
    });
  },

  _bindHelp: function() {
    document.getElementById('btnHelp').addEventListener('click', function() {
      var steps = App.t('helpSteps');
      var html = '<h3>' + App.t('helpTitle') + '</h3>';
      html += '<ol class="help-steps">';
      for (var i = 0; i < steps.length; i++) {
        html += '<li>' + steps[i] + '</li>';
      }
      html += '</ol>';
      html += '<p class="help-wish">' + App.t('helpWish') + '</p>';
      html += '<div class="btn-row"><button class="btn btn-secondary" id="btnCloseHelp">' + App.t('close') + '</button></div>';
      App.UI.showModal(html);
      document.getElementById('btnCloseHelp').addEventListener('click', function() {
        App.UI.hideModal();
      });
      App.Analytics.track('help_open');
    });
  },

  _bindModeToggle: function() {
    var self = this;

    // Start in player mode by default
    var nav = document.getElementById('tabNav');
    nav.classList.add('player-mode');
    document.getElementById('modeIcon').innerHTML = '&#9776;';

    document.getElementById('btnToggleMode').addEventListener('click', function() {
      var isPlayerMode = nav.classList.contains('player-mode');

      if (isPlayerMode) {
        // Switching to admin — require password
        self._showPasswordPrompt(function() {
          nav.classList.remove('player-mode');
          document.getElementById('modeIcon').innerHTML = '&#9881;';
          App.Analytics.track('mode_switch', { mode: 'admin' });
        });
      } else {
        // Switching back to player mode — no password needed
        nav.classList.add('player-mode');
        document.getElementById('modeIcon').innerHTML = '&#9776;';
        App.Analytics.track('mode_switch', { mode: 'player' });
        self.showTab('board');
      }
    });
  },

  _showPasswordPrompt: function(onSuccess) {
    var html = '<h3>' + App.t('adminLogin') + '</h3>';
    html += '<div class="form-row" style="margin:12px 0">';
    html += '<input type="password" id="adminPasswordInput" placeholder="' + App.t('passwordPlaceholder') + '" autocomplete="off">';
    html += '</div>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-primary" id="btnPasswordOk">' + App.t('ok') + '</button>';
    html += '<button class="btn btn-secondary" id="btnPasswordCancel">' + App.t('cancelAction') + '</button>';
    html += '</div>';
    html += '<div id="passwordError" style="color:var(--danger);font-size:13px;margin-top:8px;" hidden></div>';

    this.showModal(html);
    document.getElementById('adminPasswordInput').focus();

    var self = this;

    document.getElementById('btnPasswordOk').addEventListener('click', function() {
      var pwd = document.getElementById('adminPasswordInput').value;
      if (pwd === 'aleks') {
        self.hideModal();
        onSuccess();
      } else {
        var err = document.getElementById('passwordError');
        err.textContent = App.t('wrongPassword');
        err.hidden = false;
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPasswordInput').focus();
      }
    });

    document.getElementById('adminPasswordInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('btnPasswordOk').click();
      }
    });

    document.getElementById('btnPasswordCancel').addEventListener('click', function() {
      self.hideModal();
    });
  },

  // --- Timers ---
  startTimers: function() {
    this.timerInterval = setInterval(function() {
      // Update court timers
      document.querySelectorAll('.court-timer, .board-court-timer').forEach(function(el) {
        var start = parseInt(el.dataset.start);
        if (start) {
          el.textContent = App.Utils.formatTime(Date.now() - start);
        }
      });
    }, 1000);
  },

  // --- Modal ---
  showModal: function(html) {
    // Clone-replace to remove stale event listeners from previous modals
    var old = document.getElementById('modalContent');
    var fresh = old.cloneNode(false);
    fresh.innerHTML = html;
    old.parentNode.replaceChild(fresh, old);
    document.getElementById('modalOverlay').hidden = false;
    this._customSwapTarget = null;
  },

  hideModal: function() {
    document.getElementById('modalOverlay').hidden = true;
    document.getElementById('modalContent').innerHTML = '';
  },

  showConfirm: function(message, onConfirm) {
    var html = '<p style="margin-bottom:16px;">' + message + '</p>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-danger" id="btnConfirmYes">' + App.t('yes') + '</button>';
    html += '<button class="btn btn-secondary" id="btnConfirmNo">' + App.t('no') + '</button>';
    html += '</div>';

    this.showModal(html);

    document.getElementById('btnConfirmYes').addEventListener('click', function() {
      App.UI.hideModal();
      onConfirm();
    });

    document.getElementById('btnConfirmNo').addEventListener('click', function() {
      App.UI.hideModal();
    });
  },

  // --- Toasts ---
  showToast: function(message) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
      toast.remove();
    }, 3000);
  },

  // --- Utilities ---
  _esc: function(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// ============================================================
// DND — Drag and Drop for queue
// ============================================================
App.DnD = {
  draggedId: null,

  init: function(container) {
    var self = this;

    container.addEventListener('dragstart', function(e) {
      var item = e.target.closest('.queue-item');
      if (!item) return;
      self.draggedId = item.dataset.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });

    container.addEventListener('dragend', function(e) {
      var item = e.target.closest('.queue-item');
      if (item) item.classList.remove('dragging');
      container.querySelectorAll('.drag-over').forEach(function(el) {
        el.classList.remove('drag-over');
      });
      self.draggedId = null;
    });

    container.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var item = e.target.closest('.queue-item');
      if (item && item.dataset.id !== self.draggedId) {
        container.querySelectorAll('.drag-over').forEach(function(el) {
          el.classList.remove('drag-over');
        });
        item.classList.add('drag-over');
      }
    });

    container.addEventListener('drop', function(e) {
      e.preventDefault();
      container.querySelectorAll('.drag-over').forEach(function(el) {
        el.classList.remove('drag-over');
      });

      var targetItem = e.target.closest('.queue-item');
      if (!targetItem || !self.draggedId) return;

      var targetId = targetItem.dataset.id;
      if (targetId === self.draggedId) return;

      var targetIndex = parseInt(targetItem.dataset.index);
      App.Queue.move(self.draggedId, targetIndex);
      App.UI.renderQueue();
    });

    // Touch support for mobile
    this._initTouch(container);
  },

  _initTouch: function(container) {
    var self = this;
    var dragItem = null;
    var startY = 0;
    var clone = null;

    container.addEventListener('touchstart', function(e) {
      var handle = e.target.closest('.drag-handle');
      if (!handle) return;
      var item = handle.closest('.queue-item');
      if (!item) return;

      dragItem = item;
      self.draggedId = item.dataset.id;
      startY = e.touches[0].clientY;

      // Create visual clone
      clone = item.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.zIndex = '1000';
      clone.style.opacity = '0.8';
      clone.style.width = item.offsetWidth + 'px';
      clone.style.pointerEvents = 'none';
      clone.style.left = item.getBoundingClientRect().left + 'px';
      clone.style.top = item.getBoundingClientRect().top + 'px';
      document.body.appendChild(clone);

      item.classList.add('dragging');
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (!dragItem || !clone) return;
      e.preventDefault();

      var touch = e.touches[0];
      clone.style.top = touch.clientY - 20 + 'px';

      // Find element under finger
      clone.style.display = 'none';
      var elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      clone.style.display = '';

      container.querySelectorAll('.drag-over').forEach(function(el) {
        el.classList.remove('drag-over');
      });

      if (elementBelow) {
        var targetItem = elementBelow.closest('.queue-item');
        if (targetItem && targetItem !== dragItem) {
          targetItem.classList.add('drag-over');
        }
      }
    }, { passive: false });

    container.addEventListener('touchend', function(e) {
      if (!dragItem) return;

      if (clone) {
        clone.remove();
        clone = null;
      }

      dragItem.classList.remove('dragging');
      container.querySelectorAll('.drag-over').forEach(function(el) {
        el.classList.remove('drag-over');
      });

      // Find drop target
      var touch = e.changedTouches[0];
      var elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elementBelow) {
        var targetItem = elementBelow.closest('.queue-item');
        if (targetItem && targetItem !== dragItem) {
          var targetIndex = parseInt(targetItem.dataset.index);
          App.Queue.move(self.draggedId, targetIndex);
          App.UI.renderQueue();
        }
      }

      dragItem = null;
      self.draggedId = null;
    });
  }
};

// ============================================================
// INIT — Application startup
// ============================================================
App.init = function() {
  // Initialize i18n first
  App.i18n.init();

  var today = App.Utils.getISODate(new Date());

  // Try to load today's session
  var saved = App.Storage.load(today);
  if (saved) {
    App.state = saved;
  } else {
    // Create new session
    App.Session.create();
    App.Session.initCourts([1, 2, 3, 4]);
  }

  // Initialize UI
  App.UI.init();
  App.UI.renderAll();

  // Check for ?session= URL parameter — auto-join
  var urlParams = new URLSearchParams(window.location.search);
  var sessionParam = urlParams.get('session');
  if (sessionParam) {
    document.getElementById('sessionIdInput').value = sessionParam;
    App.Sync.init(sessionParam, false);
    App.Analytics.track('sync_join', { source: 'url' });
  } else if (App.state.settings.syncEnabled && App.state.settings.syncSessionId) {
    // If sync was active — show session ID (user clicks to reconnect)
    document.getElementById('sessionIdInput').value = App.state.settings.syncSessionId;
  }

  // Close modal on overlay click
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      App.UI.hideModal();
    }
  });
};

// Start on DOM ready
document.addEventListener('DOMContentLoaded', App.init);
