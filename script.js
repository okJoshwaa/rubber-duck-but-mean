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
    "not working", "weird", "glitchy", "acting up", "for some reason", "out of nowhere"
  ];

  var SELF_CORRECTION_PHRASES = [
    "oh wait", "wait, no", "wait no", "actually", "never mind", "nevermind",
    "oh i see", "i see now", "i found it", "found it", "got it", "there it is",
    "that's the bug", "thats the bug", "oh no way", "hold on", "oh...", "oh, i think",
    "i think i see", "duh", "of course"
  ];

  var CODE_HINTS = /[{};]|=>|function\s*\(|console\.log|def \w+\(|\bconst\b|\blet\b|\bvar\b/;

  var OPENING_QUESTIONS = [
    "Okay. Walk me through it. What did you expect to happen?",
    "Start from the top — what were you trying to do?",
    "Before we go further: what's the actual error message, verbatim?",
    "Alright. What's the first thing that happens, exactly, step by step?",
    "Fine. What's broken, and how do you know it's broken?",
    "Let's hear it. What were you trying to build, and where did it go sideways?",
    "Before you explain the bug, explain what 'working' was supposed to look like.",
    "Go. What's the smallest example that reproduces this?"
  ];

  var VAGUE_CALLOUTS = [
    "\"{phrase}\" is doing a lot of work in that sentence. Be specific.",
    "\"{phrase}\" is not a debugging strategy. What's the actual value at that point?",
    "You said \"{phrase}\" — that's the part you haven't actually checked, isn't it?",
    "Nothing in software is \"{phrase}\". Something is different between the cases. What is it?",
    "\"{phrase}\" means you haven't looked yet. Go look, then come back.",
    "I'm going to stop you right there: \"{phrase}\" is the sentence where you gave up thinking.",
    "Every bug feels like \"{phrase}\" right up until you find it. Keep going.",
    "You've used \"{phrase}\" to skip the one step that would actually tell you something."
  ];

  var SHORT_ANSWER_CALLOUTS = [
    "That's it? That's the whole explanation? Try again, slower.",
    "Say more. You skipped the part that actually matters.",
    "I need more than that. What happens right before it breaks?",
    "That's a summary, not an explanation. Give me the actual steps.",
    "You typed that fast. Slow down and describe it like I've never seen your code.",
    "One sentence isn't a bug report. What did you see, exactly?",
    "That tells me the topic, not the problem. Try again.",
    "I'm still waiting for the part where something actually happens."
  ];

  var CODE_CALLOUTS = [
    "Did you actually run this, or are you just staring at it hoping?",
    "What did this print the last time you actually executed it?",
    "Have you put a log statement here, or are you guessing what this does?",
    "Walk me through this line by line. What does each part actually return?",
    "Which line in here is the one you're least sure about? Start there.",
    "Read this out loud to me, one line at a time. Not summarized — read it.",
    "If I ran this right now, what would it print? Say a number, not a vibe.",
    "This is the code you think is fine. What's the code you haven't shown me?"
  ];

  var FOLLOWUP_QUESTIONS = [
    "And when exactly does that happen? Every time, or only sometimes — and if 'sometimes', what's different those times?",
    "What's the actual value there — not what you assume it is, what you've confirmed it is?",
    "What's different between the case that works and the case that doesn't?",
    "Have you actually checked that assumption, or are you just trusting it?",
    "Where does that value come from? Trace it back one more step.",
    "What does the error say, exactly? Not the summary — the actual text.",
    "What changed right before this started happening?",
    "If you were betting money on the cause, where would you put it — and have you checked there yet?",
    "Is this the first place it breaks, or the first place you noticed it breaking?",
    "What would you see in the logs if this were working correctly? Now what do you actually see?",
    "Could this be two bugs wearing a trenchcoat? Walk me through each symptom separately.",
    "What's the simplest possible version of this that still fails?"
  ];

  var CHECK_IN_NUDGES = [
    "You've now explained this a few different ways. Go check the thing you keep glossing over.",
    "Notice you haven't mentioned what the actual output was. That's usually where it's hiding.",
    "You're circling. Pick the one thing you're least sure about and go verify it right now.",
    "We've been at this a while. What's the one thing you still haven't actually checked?",
    "Step back. Say out loud what you know for certain versus what you're assuming.",
    "If you were explaining this to a stranger with zero context, what would you say first? Say that."
  ];

  var PRAISE_RESPONSES = [
    "Okay, that's an actual detail. Now — does that explain everything you're seeing, or just part of it?",
    "Better. That's specific enough to be useful. What's the next thing you'd check?",
    "Now we're getting somewhere. Keep going at that level of detail.",
    "That's the first real clue in this conversation. Follow it.",
    "Good — that's concrete. Does the behavior change if you isolate just that part?"
  ];

  var BREAKTHROUGH_RESPONSES = [
    "There it is. Told you explaining it out loud would do the work for you.",
    "Called it. Go fix it before you lose that thought.",
    "That's the duck method working exactly as intended. You're welcome.",
    "See, you didn't need me — you needed to hear yourself say it. Go.",
    "Knew it was in there somewhere. Go confirm it and stop talking to a duck."
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
      nudge: -1,
      praise: -1,
      breakthrough: -1
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

  function hasSelfCorrection(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < SELF_CORRECTION_PHRASES.length; i++) {
      if (lower.indexOf(SELF_CORRECTION_PHRASES[i]) !== -1) return true;
    }
    return false;
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
    var selfCorrection = hasSelfCorrection(userText);
    var words = wordCount(userText);
    var isCodey = CODE_HINTS.test(userText);
    var specific = hasSpecificDetail(userText);

    // Update skepticism
    if (vaguePhrase) state.skepticism += 2;
    if (words < 8) state.skepticism += 1;
    if (isCodey && words < 15) state.skepticism += 1;
    if (specific) state.skepticism = Math.max(0, state.skepticism - 2);
    if (selfCorrection) state.skepticism = Math.max(0, state.skepticism - 3);
    state.skepticism = Math.max(0, Math.min(9, state.skepticism));
    updateDuckMood();

    // A breakthrough ("oh wait", "found it") always wins — that's the whole point of the duck
    if (selfCorrection && state.exchangeCount > 1) {
      return pick(BREAKTHROUGH_RESPONSES, "breakthrough");
    }

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

    // Reward genuinely detailed, specific answers some of the time instead of always
    // interrogating further — occasional positive reinforcement reads as less robotic.
    if (specific && words >= 14 && Math.random() < 0.4) {
      return pick(PRAISE_RESPONSES, "praise");
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
