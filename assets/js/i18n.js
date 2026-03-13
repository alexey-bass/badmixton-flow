/* ============================================================
   Badminton 2x2 — Internationalization
   ============================================================ */

// Global application object
var App = {};

// ============================================================
// I18N — Internationalization
// ============================================================
App.i18n = {
  currentLang: 'pl',
  STORAGE_KEY: 'badminton_lang',

  translations: {
    pl: {
      // Tabs
      tabBoard: 'Tablica',
      tabSession: 'Sesja',
      tabPlayers: 'Gracze',
      tabQueue: 'Kolejka',
      tabCourts: 'Korty',
      tabHistory: 'Historia',
      tabSync: 'Sync',

      // Queue label
      queue: 'Kolejka',

      // Dashboard stats
      statPresent: 'Obecni',
      statPlaying: 'Grają',
      statInQueue: 'W kolejce',
      statCourtsOccupied: 'Korty zajęte',
      statGamesPlayed: 'Rozegranych',

      // Session settings
      sessionSettings: 'Ustawienia sesji',
      courtNumbersLabel: 'Numery kortów',
      courtNumbersHint: 'oddzielone przecinkami, np. 1,2,3',
      applyCourts: 'Zastosuj korty',

      // Display settings
      uiZoomLabel: 'Powiększenie UI',

      // Results settings
      resultsSettings: 'Ustawienia wyników',
      showResultsLabel: 'Pokaż zakładkę Wyniki',
      resultsLimitLabel: 'Widok wyników',
      resultsLimitFull: 'Pełny ranking',
      resultsLimitTop3: 'Top 3',
      resultsLimitTop5: 'Top 5',
      resultsLimitTop10: 'Top 10',

      // Session lock
      sessionLock: 'Blokada sesji',
      lockSession: 'Zablokuj sesję',
      unlockSession: 'Odblokuj sesję',
      autoLockLabel: 'Auto-blokada',
      autoLockAt: 'Auto-blokada o ',
      autoLockDisabled: 'Auto-blokada wyłączona',
      sessionLocked: 'Sesja zablokowana',
      sessionUnlocked: 'Sesja odblokowana',
      sessionAutoLocked: 'Sesja zablokowana automatycznie',
      clearQueueOnLockLabel: 'Wyczyść kolejkę przy blokadzie',

      // Sync
      syncFirebase: 'Synchronizacja Firebase',
      syncDesc: 'Synchronizuj dane między urządzeniami w czasie rzeczywistym. ID sesji to nazwa wspólnego pokoju — każdy kto je zna, może dołączyć i zobaczyć dane. Użyj 🎲 aby dodać losowy kod i utrudnić zgadnięcie ID.',
      sessionIdLabel: 'ID sesji',
      createSession: 'Utwórz sesję',
      joinSession: 'Dołącz',
      disconnect: 'Rozłącz',
      addSaltTooltip: 'Dodaj losowy kod — trudniej zgadnąć ID',
      shareLink: 'Link do udostępnienia:',
      copyLink: 'Kopiuj',
      linkCopied: 'Link skopiowany!',

      // Results
      tabResults: 'Wyniki',
      noResultsYet: 'Brak wyników — zagraj pierwszy mecz',
      resultsPlayer: 'Gracz',
      resultsGames: 'Gry',
      resultsWinRate: 'Win%',
      resultsPoints: 'Pkt',
      // Player stats modal
      psGamesPlayed: 'Rozegrane gry',
      psWinRate: 'Procent wygranych',
      psPoints: 'Punkty',
      psAvgWait: 'Śr. oczekiwanie',
      psFavoritePartner: 'Ulubiony partner',
      psMostCommonOpponent: 'Najczęstszy przeciwnik',
      psBestPair: 'Najlepsza para',
      psBestPairRate: 'wspólny win%',
      psHeadToHead: 'Bezpośrednie pojedynki',
      psOpponent: 'Przeciwnik',
      psPlayed: 'Gry',
      psRecord: 'Bilans',
      psTimesPlayed: 'razy',
      sessionHighlights: 'Podsumowanie sesji',
      hlMostActive: 'Najbardziej aktywny',
      hlWinStreak: 'Seria zwycięstw',
      hlTopScorer: 'Najlepszy strzelec',
      hlSocialButterfly: 'Grał z każdym',
      hlRivals: 'Rywale dnia',
      hlMostPatient: 'Najcierpliwszy',
      hlAvgWaitTime: 'Średni czas oczekiwania',

      // Finish confirm
      finishGameTitle: 'Zakończ grę — kort',
      scoreOptional: 'Wynik opcjonalny',
      finishConfirm: 'Zakończ',

      // Fullscreen & Wake Lock
      fullscreenTooltip: 'Pełny ekran',
      zoomTooltip: 'Powiększenie UI',
      helpTooltip: 'Pomoc',
      modeToggleTooltip: 'Przełącz tryb',
      wakeLockTooltip: 'Nie wyłączaj ekranu',

      // Help
      helpTitle: 'Jak to działa?',
      helpSteps: [
        '<b>Dodaj graczy</b> — zakładka Gracze, wpisz imię',
        '<b>Oznacz obecnych</b> — kliknij „Przyszedł"; ❤️ = z kim chce grać',
        '<b>Rozpocznij grę</b> — na Tablicy kliknij „Zaproponuj" na wolnym korcie',
        '<b>Wybierz skład</b> — zaakceptuj propozycję lub dostosuj zespoły',
        '<b>Zakończ grę</b> — kliknij „Zakończ", opcjonalnie podaj wynik',
        '<b>Powtórz</b> — gracze wracają do kolejki automatycznie'
      ],
      helpIcons: [
        ['🇵🇱 🇬🇧', 'Język'],
        ['☀', 'Ekran zawsze włączony'],
        ['⛶', 'Pełny ekran'],
        ['1x', 'Powiększenie UI'],
        ['?', 'Pomoc'],
        ['⚙ / ☰', 'Admin / gracz'],
        ['<span style="color:#4ade80">●</span>', 'Sync (zielony = OK)'],
        ['🔒', 'Blokada sesji']
      ],
      close: 'Zamknij',

      // Admin login
      adminLogin: 'Tryb administratora',
      passwordPlaceholder: 'Hasło',
      ok: 'OK',
      wrongPassword: 'Nieprawidłowe hasło',

      // Debug
      tabDebug: 'Debug',
      debugState: 'Stan sesji',
      debugSync: 'Stan synchronizacji',
      debugLocalStorage: 'LocalStorage',
      debugActions: 'Akcje',
      debugClearStorage: 'Wyczyść localStorage',
      debugConfirmClear: 'Wyczyścić całe localStorage? Utracisz wszystkie dane sesji.',
      debugCleared: 'localStorage wyczyszczone. Strona zostanie odświeżona.',
      debugPlayers: 'Graczy',
      debugPresent: 'Obecnych',
      debugInQueue: 'W kolejce',
      debugCourts: 'Kortów',
      debugOccupied: 'Zajętych',
      debugMatches: 'Meczów',
      debugSyncOff: 'Synchronizacja wyłączona',
      debugSyncOn: 'Połączono z sesją',
      debugSyncSession: 'Sesja',
      debugLastSync: 'Ostatnia synchronizacja',
      debugStorageKeys: 'Klucze',
      debugStorageSize: 'Rozmiar',
      debugCurrentState: 'Aktualny stan (JSON)',

      // Actions
      actions: 'Działania',
      newSession: 'Nowa sesja',
      newSessionDesc: 'Tworzy pustą sesję. Obecne dane zostają zapisane.',
      resetDay: 'Resetuj dzień',
      resetDayDesc: 'Zeruje statystyki, kolejkę i mecze. Gracze pozostają na liście.',
      exportJSON: 'Eksport JSON',
      exportDesc: 'Pobiera kopię zapasową sesji jako plik JSON.',
      importJSON: 'Import JSON',
      importDesc: 'Wczytuje sesję z pliku JSON.',

      // Players
      addPlayer: 'Dodaj',
      playerNamePlaceholder: 'Imię gracza',
      arrived: 'Przyszedł',
      left: 'Wyszedł',
      toQueue: 'Do kolejki',
      fromQueue: 'Z kolejki',
      gamesOne: ' gra', gamesTwo: ' gry', gamesFive: ' gier',
      waitNew: 'nowy',
      waitMin: ' min',
      court: 'Kort ',
      queuePos: 'Kolejka #',
      absent: 'Nieobecny',
      presentStatus: 'Obecny',
      pairWith: 'Para z ',
      wishFulfilled: ' (spełnione)',
      addPlayersHint: 'Dodaj graczy',
      cantDeletePlaying: 'Nie można usunąć gracza podczas gry',
      playerOnCourt: 'Gracz jest na korcie',
      playerAdded: ' dodany',
      emojiHint: 'Taka nazwa już jest. Dodaj emoji lub',
      emojiSkip: 'dodaj tak',
      emojiToggleTooltip: 'Dodaj emoji do imienia',
      emojiPickName: 'Wybierz emoji:',
      editPlayerName: 'Zmień imię',
      playerRenamed: 'Imię zmienione',
      wishPlayWith: 'Chcę grać z...',

      // Queue
      inQueue: 'W kolejce',
      queueEmpty: 'Kolejka pusta',

      // Courts
      finish: 'Zakończ',
      cancel: 'Anuluj',
      courtFree: 'Kort wolny',
      suggestLineup: 'Zaproponuj skład',
      selectManually: 'Wybierz ręcznie',
      courtOccupied: 'Kort zajęty',
      playersDuplicate: 'Gracze nie mogą się powtarzać',
      alreadyOnCourt: ' już jest na innym korcie',
      gameStartedOn: 'Gra rozpoczęta na korcie ',
      noActiveGame: 'Brak aktywnej gry na korcie',
      gameFinishedOn: 'Gra na korcie ',
      gameFinishedSuffix: ' zakończona',
      gameCancelled: 'Gra anulowana, gracze wrócili do kolejki',

      // Board
      boardFinish: 'Zakończ',
      boardFree: 'Wolny',
      boardSuggest: 'Zaproponuj',

      // History
      allCourts: 'Wszystkie korty',
      allPlayers: 'Wszyscy gracze',
      undoLastMatch: 'Cofnij ostatni',
      noMatches: 'Brak meczów',
      noFinishedMatches: 'Brak zakończonych meczów',
      lastMatchUndone: 'Ostatni mecz cofnięty',

      // Suggest
      notEnoughPlayers: 'Za mało graczy w kolejce (min. 2, jest ',
      notEnoughPlayersSuffix: ')',
      selectedPlayers: 'Wybrani: ',
      firstInQueue: 'Pierwsi w kolejce',
      wantsPlayWith: 'chce grać z ',
      alreadyPaired: ' już w parze ',
      timesN: ' razy',
      wishLabel: 'Życzenie: ',

      // Suggest modal
      suggestionFor: 'Propozycja dla kortu ',
      teamSplit: 'Podział na zespoły:',
      customSplit: 'Własny',
      customSplitHint: 'Kliknij gracza, potem drugiego — zamienią się miejscami',
      customBench: 'Dostępni:',
      startGame: 'Rozpocznij grę',
      cancelAction: 'Anuluj',

      // Player select modal
      selectPlayersFor: 'Wybór graczy — kort ',
      select4Players: 'Wybierz 4 graczy:',
      select2to4Players: 'Wybierz 2–4 graczy:',
      inQueueLabel: 'w kolejce',
      splitHeading: 'Podział:',
      already4Selected: 'Już wybrano 4 graczy',

      // Wish dialog
      wishFor: 'Życzenie: ',
      selectPartner: 'Wybierz partnera do gry:',
      noWish: 'Bez życzenia',
      closeBtn: 'Zamknij',
      wishSet: 'Życzenie ustawione',
      wishRemoved: 'Życzenie usunięte',

      // Confirm dialog
      yes: 'Tak',
      no: 'Nie',

      // Session actions
      confirmNewSession: 'Utworzyć nową sesję? Obecne dane zostaną zapisane.',
      newSessionCreated: 'Nowa sesja utworzona',
      confirmResetDay: 'Zresetować dane za dzisiaj?',
      dayReset: 'Dzień zresetowany',

      // Export/Import
      exportDone: 'Eksport zakończony',
      importDone: 'Import zakończony',
      invalidFile: 'Nieprawidłowy format pliku',
      fileReadError: 'Błąd odczytu pliku',

      // Courts settings
      enterCourtNumbers: 'Wprowadź numery kortów',
      maxCourts: 'Maksymalnie 5 kortów',
      courtsUpdated: 'Korty zaktualizowane: ',

      // Sync messages
      firebaseNotLoaded: 'Firebase SDK nie załadowane. Sprawdź połączenie.',
      configureFirebase: 'Skonfiguruj Firebase w app.js (sekcja App.Sync.init)',
      sessionCreated: 'Sesja utworzona: ',
      createSessionTitle: 'Nowa sesja synchronizacji',
      createSessionDesc: 'Masz istniejące dane. Co chcesz zrobić?',
      createSessionFresh: 'Zacznij od nowa',
      createSessionKeepPlayers: 'Zachowaj listę graczy',
      enterSessionId: 'Wprowadź ID sesji',
      sessionNotFound: 'Sesja nie istnieje',
      connectedToSession: 'Połączono z sesją: ',
      disconnectedMsg: 'Rozłączono',
      syncDisconnected: 'Rozłączono z synchronizacją',

      // Confirm actions
      confirmCancelGame: 'Anulować grę? Gracze wrócą do kolejki.',
      confirmDeletePlayer: 'Usunąć gracza ',
      confirmDeleteSuffix: '?',
      confirmRemoveAll: 'Usunąć wszystkich graczy, którzy nie są na korcie?',
      removeAllPlayers: 'Usuń wszystkich',
      renumberPlayers: 'Przenumeruj',
      confirmRenumber: 'Przenumerować graczy od 1?',
      playersRenumbered: 'Gracze przenumerowani',
      confirmUndoMatch: 'Cofnąć ostatni zakończony mecz?',

      // Day names
      days: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
    },

    en: {
      // Tabs
      tabBoard: 'Board',
      tabSession: 'Session',
      tabPlayers: 'Players',
      tabQueue: 'Queue',
      tabCourts: 'Courts',
      tabHistory: 'History',
      tabSync: 'Sync',

      // Queue label
      queue: 'Queue',

      // Dashboard stats
      statPresent: 'Present',
      statPlaying: 'Playing',
      statInQueue: 'In queue',
      statCourtsOccupied: 'Courts busy',
      statGamesPlayed: 'Games played',

      // Session settings
      sessionSettings: 'Session settings',
      courtNumbersLabel: 'Court numbers',
      courtNumbersHint: 'comma-separated, e.g. 1,2,3',
      applyCourts: 'Apply courts',

      // Display settings
      uiZoomLabel: 'UI zoom',

      // Results settings
      resultsSettings: 'Results settings',
      showResultsLabel: 'Show Results tab',
      resultsLimitLabel: 'Results view',
      resultsLimitFull: 'Full leaderboard',
      resultsLimitTop3: 'Top 3',
      resultsLimitTop5: 'Top 5',
      resultsLimitTop10: 'Top 10',

      // Session lock
      sessionLock: 'Session lock',
      lockSession: 'Lock session',
      unlockSession: 'Unlock session',
      autoLockLabel: 'Auto-lock',
      autoLockAt: 'Auto-lock at ',
      autoLockDisabled: 'Auto-lock disabled',
      sessionLocked: 'Session locked',
      sessionUnlocked: 'Session unlocked',
      sessionAutoLocked: 'Session auto-locked',
      clearQueueOnLockLabel: 'Clear queue on lock',

      // Sync
      syncFirebase: 'Firebase Sync',
      syncDesc: 'Sync data between devices in real time. The session ID is the name of a shared room — anyone who knows it can join and see the data. Use 🎲 to add a random code and make the ID harder to guess.',
      sessionIdLabel: 'Session ID',
      createSession: 'Create session',
      joinSession: 'Join',
      disconnect: 'Disconnect',
      addSaltTooltip: 'Add random code — harder to guess the ID',
      shareLink: 'Share link:',
      copyLink: 'Copy',
      linkCopied: 'Link copied!',

      // Results
      tabResults: 'Results',
      noResultsYet: 'No results yet — play a game first',
      resultsPlayer: 'Player',
      resultsGames: 'Games',
      resultsWinRate: 'Win%',
      resultsPoints: 'Pts',
      // Player stats modal
      psGamesPlayed: 'Games played',
      psWinRate: 'Win rate',
      psPoints: 'Points',
      psAvgWait: 'Avg wait',
      psFavoritePartner: 'Favorite partner',
      psMostCommonOpponent: 'Most common opponent',
      psBestPair: 'Best pair',
      psBestPairRate: 'joint win%',
      psHeadToHead: 'Head-to-head',
      psOpponent: 'Opponent',
      psPlayed: 'Played',
      psRecord: 'Record',
      psTimesPlayed: 'times',
      sessionHighlights: 'Session Highlights',
      hlMostActive: 'Most active',
      hlWinStreak: 'Win streak',
      hlTopScorer: 'Top scorer',
      hlSocialButterfly: 'Social butterfly',
      hlRivals: 'Rivals of the day',
      hlMostPatient: 'Most patient',
      hlAvgWaitTime: 'Avg wait time',

      // Finish confirm
      finishGameTitle: 'Finish game — court',
      scoreOptional: 'Score is optional',
      finishConfirm: 'Finish',

      // Fullscreen & Wake Lock
      fullscreenTooltip: 'Fullscreen',
      zoomTooltip: 'UI zoom',
      helpTooltip: 'Help',
      modeToggleTooltip: 'Toggle mode',
      wakeLockTooltip: 'Keep screen on',

      // Help
      helpTitle: 'How does it work?',
      helpSteps: [
        '<b>Add players</b> — Players tab, enter a name',
        '<b>Mark present</b> — tap "Arrived"; ❤️ = pick who they want to play with',
        '<b>Start a game</b> — on Board, tap "Suggest" on a free court',
        '<b>Pick teams</b> — accept the suggestion or customize teams',
        '<b>Finish game</b> — tap "Finish", optionally enter the score',
        '<b>Repeat</b> — players return to queue automatically'
      ],
      helpIcons: [
        ['🇵🇱 🇬🇧', 'Language'],
        ['☀', 'Keep screen on'],
        ['⛶', 'Fullscreen'],
        ['1x', 'UI zoom'],
        ['?', 'Help'],
        ['⚙ / ☰', 'Admin / player'],
        ['<span style="color:#4ade80">●</span>', 'Sync (green = OK)'],
        ['🔒', 'Session lock']
      ],
      close: 'Close',

      // Admin login
      adminLogin: 'Admin mode',
      passwordPlaceholder: 'Password',
      ok: 'OK',
      wrongPassword: 'Wrong password',

      // Debug
      tabDebug: 'Debug',
      debugState: 'Session state',
      debugSync: 'Sync state',
      debugLocalStorage: 'LocalStorage',
      debugActions: 'Actions',
      debugClearStorage: 'Clear localStorage',
      debugConfirmClear: 'Clear all localStorage? You will lose all session data.',
      debugCleared: 'localStorage cleared. Page will reload.',
      debugPlayers: 'Players',
      debugPresent: 'Present',
      debugInQueue: 'In queue',
      debugCourts: 'Courts',
      debugOccupied: 'Occupied',
      debugMatches: 'Matches',
      debugSyncOff: 'Sync disabled',
      debugSyncOn: 'Connected to session',
      debugSyncSession: 'Session',
      debugLastSync: 'Last synced',
      debugStorageKeys: 'Keys',
      debugStorageSize: 'Size',
      debugCurrentState: 'Current state (JSON)',

      // Actions
      actions: 'Actions',
      newSession: 'New session',
      newSessionDesc: 'Creates an empty session. Current data is saved.',
      resetDay: 'Reset day',
      resetDayDesc: 'Resets stats, queue, and matches. Players stay on the list.',
      exportJSON: 'Export JSON',
      exportDesc: 'Downloads a backup of the session as a JSON file.',
      importJSON: 'Import JSON',
      importDesc: 'Loads a session from a JSON file.',

      // Players
      addPlayer: 'Add',
      playerNamePlaceholder: 'Player name',
      arrived: 'Arrived',
      left: 'Left',
      toQueue: 'To queue',
      fromQueue: 'From queue',
      gamesOne: ' game', gamesTwo: ' games', gamesFive: ' games',
      waitNew: 'new',
      waitMin: ' min',
      court: 'Court ',
      queuePos: 'Queue #',
      absent: 'Absent',
      presentStatus: 'Present',
      pairWith: 'Pair with ',
      wishFulfilled: ' (done)',
      addPlayersHint: 'Add players',
      cantDeletePlaying: 'Cannot delete player during game',
      playerOnCourt: 'Player is on court',
      playerAdded: ' added',
      emojiHint: 'Name already exists. Add emoji or',
      emojiSkip: 'add as-is',
      emojiToggleTooltip: 'Add emoji to name',
      emojiPickName: 'Pick an emoji:',
      editPlayerName: 'Edit name',
      playerRenamed: 'Name updated',
      wishPlayWith: 'Want to play with...',

      // Queue
      inQueue: 'In queue',
      queueEmpty: 'Queue empty',

      // Courts
      finish: 'Finish',
      cancel: 'Cancel',
      courtFree: 'Court free',
      suggestLineup: 'Suggest lineup',
      selectManually: 'Select manually',
      courtOccupied: 'Court occupied',
      playersDuplicate: 'Players must be unique',
      alreadyOnCourt: ' is already on another court',
      gameStartedOn: 'Game started on court ',
      noActiveGame: 'No active game on court',
      gameFinishedOn: 'Game on court ',
      gameFinishedSuffix: ' finished',
      gameCancelled: 'Game cancelled, players returned to queue',

      // Board
      boardFinish: 'Finish',
      boardFree: 'Free',
      boardSuggest: 'Suggest',

      // History
      allCourts: 'All courts',
      allPlayers: 'All players',
      undoLastMatch: 'Undo last',
      noMatches: 'No matches',
      noFinishedMatches: 'No finished matches',
      lastMatchUndone: 'Last match undone',

      // Suggest
      notEnoughPlayers: 'Not enough players in queue (need 2, have ',
      notEnoughPlayersSuffix: ')',
      selectedPlayers: 'Selected: ',
      firstInQueue: 'First in queue',
      wantsPlayWith: 'wants to play with ',
      alreadyPaired: ' already paired ',
      timesN: ' times',
      wishLabel: 'Wish: ',

      // Suggest modal
      suggestionFor: 'Suggestion for court ',
      teamSplit: 'Team split:',
      customSplit: 'Custom',
      customSplitHint: 'Tap a player, then another — they swap places',
      customBench: 'Available:',
      startGame: 'Start game',
      cancelAction: 'Cancel',

      // Player select modal
      selectPlayersFor: 'Select players — court ',
      select4Players: 'Select 4 players:',
      select2to4Players: 'Select 2–4 players:',
      inQueueLabel: 'in queue',
      splitHeading: 'Split:',
      already4Selected: 'Already selected 4 players',

      // Wish dialog
      wishFor: 'Wish: ',
      selectPartner: 'Select partner:',
      noWish: 'No preference',
      closeBtn: 'Close',
      wishSet: 'Wish set',
      wishRemoved: 'Wish removed',

      // Confirm dialog
      yes: 'Yes',
      no: 'No',

      // Session actions
      confirmNewSession: 'Create new session? Current data will be saved.',
      newSessionCreated: 'New session created',
      confirmResetDay: 'Reset today\'s data?',
      dayReset: 'Day reset',

      // Export/Import
      exportDone: 'Export complete',
      importDone: 'Import complete',
      invalidFile: 'Invalid file format',
      fileReadError: 'File read error',

      // Courts settings
      enterCourtNumbers: 'Enter court numbers',
      maxCourts: 'Maximum 5 courts',
      courtsUpdated: 'Courts updated: ',

      // Sync messages
      firebaseNotLoaded: 'Firebase SDK not loaded. Check your connection.',
      configureFirebase: 'Configure Firebase in app.js (App.Sync.init section)',
      sessionCreated: 'Session created: ',
      createSessionTitle: 'New sync session',
      createSessionDesc: 'You have existing data. What would you like to do?',
      createSessionFresh: 'Start fresh',
      createSessionKeepPlayers: 'Keep player list',
      enterSessionId: 'Enter session ID',
      sessionNotFound: 'Session not found',
      connectedToSession: 'Connected to session: ',
      disconnectedMsg: 'Disconnected',
      syncDisconnected: 'Disconnected from sync',

      // Confirm actions
      confirmCancelGame: 'Cancel game? Players will return to queue.',
      confirmDeletePlayer: 'Delete player ',
      confirmDeleteSuffix: '?',
      confirmRemoveAll: 'Remove all players who are not on court?',
      removeAllPlayers: 'Remove all',
      renumberPlayers: 'Renumber',
      confirmRenumber: 'Renumber players from 1?',
      playersRenumbered: 'Players renumbered',
      confirmUndoMatch: 'Undo last finished match?',

      // Day names
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }
  },

  // Get translation by key
  t: function(key) {
    var dict = this.translations[this.currentLang] || this.translations.pl;
    return dict[key] !== undefined ? dict[key] : key;
  },

  // Plural: 1 → 'one', 2-4 → 'few' (PL only), 5+ → 'many' (PL teens always 'many')
  plural: function(n, forms) {
    if (n === 1) return n + forms.one;
    if (this.currentLang !== 'pl') return n + (forms.other || forms.many);
    var abs = Math.abs(n);
    var lastDigit = abs % 10;
    var lastTwo = abs % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return n + forms.few;
    return n + forms.many;
  },

  // Apply translations to DOM elements with data-i18n attributes
  apply: function() {
    var self = this;

    // data-i18n — set textContent
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = self.t(key);
      if (val !== key) el.textContent = val;
    });

    // data-i18n-placeholder — set placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = self.t(key);
      if (val !== key) el.placeholder = val;
    });

    // data-i18n-title — set title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var val = self.t(key);
      if (val !== key) el.title = val;
    });

    // data-i18n-opt — set option text
    document.querySelectorAll('[data-i18n-opt]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-opt');
      var val = self.t(key);
      if (val !== key) el.textContent = val;
    });
  },

  // Set language and re-render
  setLang: function(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    if (typeof App.Analytics !== 'undefined') App.Analytics.track('lang_switch', { lang: lang });
    localStorage.setItem(this.STORAGE_KEY, lang);

    // Update active state on buttons
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.documentElement.lang = lang;
    this.apply();

    // Re-render dynamic content
    if (App.state) {
      App.UI.renderAll();
    }
  },

  // Initialize: load saved language, bind switcher
  init: function() {
    var saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    }

    document.documentElement.lang = this.currentLang;

    // Set active button
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.lang === App.i18n.currentLang);
    });

    // Bind switcher clicks
    var switcher = document.getElementById('langSwitcher');
    if (switcher) {
      switcher.addEventListener('click', function(e) {
        var btn = e.target.closest('.lang-btn');
        if (!btn) return;
        App.i18n.setLang(btn.dataset.lang);
      });
    }

    this.apply();
  }
};

// Shortcut for translation
App.t = function(key) {
  return App.i18n.t(key);
};

// Shortcut for games plural
App.tGames = function(n) {
  return App.i18n.plural(n, {
    one: App.i18n.t('gamesOne'),
    few: App.i18n.t('gamesTwo'),
    many: App.i18n.t('gamesFive'),
    other: App.i18n.t('gamesFive')
  });
};
