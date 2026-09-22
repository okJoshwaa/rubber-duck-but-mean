# Rubber Duck, But Mean

Rubber duck debugging is a real technique: explaining your bug out loud, step by step, forces you to notice the assumptions you're silently skipping over. A real duck just sits there, though. This one pushes back.

Explain what you're debugging in the chat. It responds with rule-based, escalating prompts instead of empty validation:

- Vague explanations ("should work", "sometimes", "idk") get called out by name
- Short, hand-wavy answers get sent back for more detail
- Pasted code gets asked whether you actually ran it
- Every few exchanges, it stops and tells you to go check the thing you're avoiding
- A skepticism meter (and the duck's expression) visibly escalates the vaguer you get, and eases off when you get specific

No AI, no API calls, no backend — it's a deterministic set of pattern-matching rules and response pools, running entirely in your browser.

## Try it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Why this works

The value of rubber duck debugging isn't the duck — it's the forcing function. Saying "it just doesn't work" out loud sounds obviously incomplete in a way that thinking it doesn't. A plain duck can't call that out; a few well-chosen rules can.

## Stack

Vanilla HTML/CSS/JS. No build step, no dependencies, no framework. The whole response logic is in `script.js`.

## License

MIT — see [LICENSE](LICENSE).
