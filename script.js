(function () {
  "use strict";

  var chatLog = document.getElementById("chatLog");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var duckAvatar = document.getElementById("duckAvatar");
  var skepticismFill = document.getElementById("skepticismFill");
  var resetBtn = document.getElementById("resetBtn");

  var VAGUE_PHRASES = [
    "should work", "supposed to work", "just works", "i don't know", "i dont know",
    "idk", "no idea", "sometimes", "randomly", "at random", "it just", "not sure",
    "somehow", "i guess", "maybe", "it breaks", "doesn't work", "isn't working",
    "not working"
  ];

  var CODE_HINTS = /[{};]|=>|function\s*\(|console\.log|def \w+\(|\bconst\b|\blet\b|\bvar\b/;

  var OPENING_QUESTIONS = [
    "Okay. Walk me through it. What did you expect to happen?",
    "Start from the top — what were you trying to do?",
    "Before we go further: what's the actual error message, verbatim?",
    "Alright. What's the first thing that happens, exactly, step by step?"
  ];

  var VAGUE_CALLOUTS = [
    "\"{phrase}\" is doing a lot of work in that sentence. Be specific.",
    "\"{phrase}\" is not a debugging strategy. What's the actual value at that point?",
    "You said \"{phrase}\" — that's the part you haven't actually checked, isn't it?",
    "Nothing in software is \"{phrase}\". Something is different between the cases. What is it?"
  ];

  var SHORT_ANSWER_CALLOUTS = [
    "That's it? That's the whole explanation? Try again, slower.",
    "Say more. You skipped the part that actually matters.",
    "I need more than that. What happens right before it breaks?",
    "That's a summary, not an explanation. Give me the actual steps."
  ];

  var CODE_CALLOUTS = [
    "Did you actually run this, or are you just staring at it hoping?",
    "What did this print the last time you actually executed it?",
    "Have you put a log statement here, or are you guessing what this does?",
    "Walk me through this line by line. What does each part actually return?"
  ];

  var FOLLOWUP_QUESTIONS = [
    "And when exactly does that happen? Every time, or only sometimes — and if 'sometimes', what's different those times?",
    "What's the actual value there — not what you assume it is, what you've confirmed it is?",
    "What's different between the case that works and the case that doesn't?",
    "Have you actually checked that assumption, or are you just trusting it?",
    "Where does that value come from? Trace it back one more step.",
    "What does the error say, exactly? Not the summary — the actual text."
  ];

  var CHECK_IN_NUDGES = [
    "You've now explained this a few different ways. Go check the thing you keep glossing over.",
    "Notice you haven't mentioned what the actual output was. That's usually where it's hiding.",
    "You're circling. Pick the one thing you're least sure about and go verify it right now."
  ];

  var state = {
    exchangeCount: 0,
    skepticism: 0,
    lastCategory: {
      opening: -1,
      vague: -1,
      short: -1,
      code: -1,
      followup: -1,
      nudge: -1
    }
  };

  function pick(list, categoryKey) {
    if (list.length === 1) return list[0];
    var lastIdx = state.lastCategory[categoryKey];
    var idx;
    do {
      idx = Math.floor(Math.random() * list.length);
    } while (idx === lastIdx);
    state.lastCategory[categoryKey] = idx;
    return list[idx];
  }

  function findVaguePhrase(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < VAGUE_PHRASES.length; i++) {
      if (lower.indexOf(VAGUE_PHRASES[i]) !== -1) return VAGUE_PHRASES[i];
    }
    return null;
  }

  function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function hasSpecificDetail(text) {
    return /\d/.test(text) || /["'`]/.test(text) || wordCount(text) > 18;
  }

  function addMessage(role, text) {
    var msg = document.createElement("div");
    msg.className = "msg " + role;
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    msg.appendChild(bubble);
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function updateDuckMood() {
    duckAvatar.classList.remove("skeptical", "mad");
    if (state.skepticism >= 6) {
      duckAvatar.classList.add("mad");
    } else if (state.skepticism >= 3) {
      duckAvatar.classList.add("skeptical");
    }

    var pct = Math.min(100, (state.skepticism / 8) * 100);
    skepticismFill.style.width = pct + "%";
    if (state.skepticism >= 6) {
      skepticismFill.style.background = "var(--mad)";
    } else if (state.skepticism >= 3) {
      skepticismFill.style.background = "var(--warn)";
    } else {
      skepticismFill.style.background = "var(--calm)";
    }
  }

  function respond(userText) {
    state.exchangeCount += 1;
    var vaguePhrase = findVaguePhrase(userText);
    var words = wordCount(userText);
    var isCodey = CODE_HINTS.test(userText);
    var specific = hasSpecificDetail(userText);

    // Update skepticism
    if (vaguePhrase) state.skepticism += 2;
    if (words < 8) state.skepticism += 1;
    if (isCodey && words < 15) state.skepticism += 1;
    if (specific) state.skepticism = Math.max(0, state.skepticism - 2);
    state.skepticism = Math.max(0, Math.min(9, state.skepticism));
    updateDuckMood();

    // Periodic check-in nudge takes priority every 4th exchange
    if (state.exchangeCount % 4 === 0) {
      return pick(CHECK_IN_NUDGES, "nudge");
    }

    if (state.exchangeCount === 1 && words < 6) {
      return pick(SHORT_ANSWER_CALLOUTS, "short");
    }

    if (state.exchangeCount === 1) {
      return pick(OPENING_QUESTIONS, "opening");
    }

    if (vaguePhrase) {
      var line = pick(VAGUE_CALLOUTS, "vague");
      return line.replace("{phrase}", vaguePhrase);
    }

    if (words < 8) {
      return pick(SHORT_ANSWER_CALLOUTS, "short");
    }

    if (isCodey && words < 15) {
      return pick(CODE_CALLOUTS, "code");
    }

    return pick(FOLLOWUP_QUESTIONS, "followup");
  }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;

    addMessage("user", text);
    chatInput.value = "";

    var duckReply = respond(text);
    window.setTimeout(function () {
      addMessage("duck", duckReply);
    }, 350);
  });

  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  resetBtn.addEventListener("click", function () {
    state = {
      exchangeCount: 0,
      skepticism: 0,
      lastCategory: { opening: -1, vague: -1, short: -1, code: -1, followup: -1, nudge: -1 }
    };
    updateDuckMood();
    chatLog.innerHTML = "";
    addMessage("duck", "Alright. What are you debugging?");
    chatInput.focus();
  });
})();
