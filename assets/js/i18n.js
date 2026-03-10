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

      // Sync
      syncFirebase: 'Synchronizacja Firebase',
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
      sessionHighlights: 'Podsumowanie sesji',
      hlMostActive: 'Najbardziej aktywny',
      hlWinStreak: 'Seria zwycięstw',
      hlTopScorer: 'Najlepszy strzelec',
      hlSocialButterfly: 'Grał z każdym',
      hlRivals: 'Rywale dnia',

      // Finish confirm
      finishGameTitle: 'Zakończ grę — kort',
      scoreOptional: 'Wynik opcjonalny',
      finishConfirm: 'Zakończ',

      // Fullscreen
      fullscreenTooltip: 'Pełny ekran',

      // Help
      helpTitle: 'Jak to działa?',
      helpSteps: [
        '<b>Dodaj graczy</b> — zakładka Gracze, wpisz imię',
        '<b>Oznacz obecnych</b> — kliknij „Przyszedł" przy każdym graczu',
        '<b>Rozpocznij grę</b> — na Tablicy kliknij „Zaproponuj" na wolnym korcie',
        '<b>Wybierz skład</b> — zaakceptuj propozycję lub dostosuj zespoły',
        '<b>Zakończ grę</b> — kliknij „Zakończ", opcjonalnie podaj wynik',
        '<b>Powtórz</b> — gracze wracają do kolejki automatycznie'
      ],
      helpWish: 'Kliknij ❤️ przy graczu, aby wybrać z kim chce grać',
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
      debugStorageKeys: 'Klucze',
      debugStorageSize: 'Rozmiar',
      debugCurrentState: 'Aktualny stan (JSON)',

      // Actions
      actions: 'Działania',
      newSession: 'Nowa sesja',
      resetDay: 'Resetuj dzień',
      exportJSON: 'Eksport JSON',
      importJSON: 'Import JSON',

      // Players
      addPlayer: 'Dodaj',
      playerNamePlaceholder: 'Imię gracza',
      arrived: 'Przyszedł',
      left: 'Wyszedł',
      toQueue: 'Do kolejki',
      fromQueue: 'Z kolejki',
      gamesN: ' gier',
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
      notEnoughPlayers: 'Za mało graczy w kolejce (min. 4, jest ',
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
      enterSessionId: 'Wprowadź ID sesji',
      connectedToSession: 'Połączono z sesją: ',
      disconnectedMsg: 'Rozłączono',
      syncDisconnected: 'Rozłączono z synchronizacją',

      // Confirm actions
      confirmCancelGame: 'Anulować grę? Gracze wrócą do kolejki.',
      confirmDeletePlayer: 'Usunąć gracza ',
      confirmDeleteSuffix: '?',
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

      // Sync
      syncFirebase: 'Firebase Sync',
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
      sessionHighlights: 'Session Highlights',
      hlMostActive: 'Most active',
      hlWinStreak: 'Win streak',
      hlTopScorer: 'Top scorer',
      hlSocialButterfly: 'Social butterfly',
      hlRivals: 'Rivals of the day',

      // Finish confirm
      finishGameTitle: 'Finish game — court',
      scoreOptional: 'Score is optional',
      finishConfirm: 'Finish',

      // Fullscreen
      fullscreenTooltip: 'Fullscreen',

      // Help
      helpTitle: 'How does it work?',
      helpSteps: [
        '<b>Add players</b> — Players tab, enter a name',
        '<b>Mark present</b> — tap "Arrived" for each player',
        '<b>Start a game</b> — on Board, tap "Suggest" on a free court',
        '<b>Pick teams</b> — accept the suggestion or customize teams',
        '<b>Finish game</b> — tap "Finish", optionally enter the score',
        '<b>Repeat</b> — players return to queue automatically'
      ],
      helpWish: 'Tap ❤️ next to a player to pick who they want to play with',
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
      debugStorageKeys: 'Keys',
      debugStorageSize: 'Size',
      debugCurrentState: 'Current state (JSON)',

      // Actions
      actions: 'Actions',
      newSession: 'New session',
      resetDay: 'Reset day',
      exportJSON: 'Export JSON',
      importJSON: 'Import JSON',

      // Players
      addPlayer: 'Add',
      playerNamePlaceholder: 'Player name',
      arrived: 'Arrived',
      left: 'Left',
      toQueue: 'To queue',
      fromQueue: 'From queue',
      gamesN: ' games',
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
      notEnoughPlayers: 'Not enough players in queue (need 4, have ',
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
      enterSessionId: 'Enter session ID',
      connectedToSession: 'Connected to session: ',
      disconnectedMsg: 'Disconnected',
      syncDisconnected: 'Disconnected from sync',

      // Confirm actions
      confirmCancelGame: 'Cancel game? Players will return to queue.',
      confirmDeletePlayer: 'Delete player ',
      confirmDeleteSuffix: '?',
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
