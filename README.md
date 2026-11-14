# Mr. Alpha Phi commenter

Every comment on the Mr. Alpha Phi Instagram post is a point. This posts comments
on that post from **your own** Instagram account, every 2 seconds, picking a random
line from `comments.txt` each time.

It runs on a laptop (Mac or Windows), not a phone. iPhones don't let one app type
into another app.

## Setup (once)

1. Install **Node.js** (the "LTS" version) from https://nodejs.org and
   **Google Chrome** from https://google.com/chrome if you don't have them.
2. Get this folder: click the green **Code** button on this page, then
   **Download ZIP**, and unzip it. (Or `git clone` it if you know how.)
3. Open a terminal in the folder:
   - **Mac:** open the Terminal app, type `cd ` (with a space), drag the unzipped
     folder into the window, and press Enter.
   - **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
4. Run:
   ```
   npm install
   ```

## Run it

```
npm start
```

A Chrome window opens on the post. The first time, **log in to Instagram in that
window**, then go back to the terminal and press Enter. It remembers your login
after that.

You'll see lines like `#12 posted: yooo`. To stop it, press **Ctrl+C** in the terminal.

## Change things

- **What it comments:** edit `comments.txt`, one comment per line. Restart it
  after editing (Ctrl+C, then `npm start` again).
- **Speed:** run `node comment.mjs https://www.instagram.com/p/DftAVKmqG_B/ --min 5 --max 10`
  to wait 5 to 10 seconds between comments instead of 2.
- **Stop after a set number:** add `--limit 200`.

## Things to know

- **Instagram will probably block you at some point.** It doesn't publish its
  limits. When it shows a "Try Again Later" message, the script stops by itself,
  because pushing past a block makes the next one longer. Wait a few hours, then
  start it again, maybe slower.
- **Check that your comments actually show up.** Instagram can quietly hide comments
  it thinks are spam. They look posted to you, but nobody else sees them, and they
  probably won't count. Every so often, have a friend check the post on their phone.
- **This is against Instagram's rules for automated posting**, even if Alpha Phi
  says bots are fine. The risk (blocks, or in a bad case a flagged account) is on
  the account you log in with.
- **Keep your laptop awake.** If it goes to sleep, the script pauses.
- Your login is saved in a `.chrome-profile` folder inside this folder. Don't send
  that folder to anyone.
