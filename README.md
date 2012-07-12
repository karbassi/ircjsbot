# About
This is an IRC client/bot, its main purpose is to test the [experimental branch of IRC-js](https://github.com/gf3/IRC-js/tree/nlogax/experimental).
Most work goes into [IRC-js](https://github.com/gf3/IRC-js/tree/nlogax/experimental), and is then used and evaluated here.
The plugin API lives in here, but once we're happy with it, it'll probably move into [IRC-js branch](https://github.com/gf3/IRC-js/tree/nlogax/experimental).
Oh, there's a rudimentary [IRC server](https://github.com/gf3/IRC-js/blob/nlogax/experimental/spec/server.js)used for testing, if you like hacking on servers.
Anyway, there's a variety of fun stuff to hack on, please do!

## Installation
Clone the repository, run `npm install` in the root folder of the repository.

## Usage
The configuration file, [`config.json`](/nlogax/ircjsbot/blob/master/config-example.json), lets you specify default channels to join, nickname, etc.
The main script, [`bot.js`](/nlogax/ircjsbot/blob/master/bot.js), takes an optional command line argument: the path to the configuration file.
You can then run it like this: `node --harmony bot.js config-dev.json`, or omit the argument and use the [default `config.json`](/nlogax/ircjsbot/blob/master/config-example.json).

There is a plugin API in development and some plugins [over here](https://github.com/nlogax/ircjsbot-plugins).
If you want to use them, run `git submodule update --init` and you should get a `plugin` directory with plugins in it.
Then just add the ones you want to the configuration file.

## Contributing
Things that need work, which would improve [IRC-js](https://github.com/gf3/IRC-js/tree/nlogax/experimental) and this project a lot:

* Go through the various IRC commands and make sure that the corresponding handlers in IRC-js handle them properly.
* Especially the ones that involve channels and users, so that we have a consistent and correct view of them. 
* Expand upon the mock IRC server, making it more like an actual server. Would make testing a lot nicer.
* Make nice plugins, and fix or report things that suck about the API.

Most of the fun stuff happens in [IRC-js](https://github.com/gf3/IRC-js/tree/nlogax/experimental), so if you are interested, check that out.

While developing, use the `--use_strict --harmony` V8 options (if your version of node does not yet contain some of my patches, `--use_strict` will make node itself crash. In that cause, you are excused).
Prefer `const` over `let` or `var` wherever possible.

The bot uses the same code style as IRC-js. It is not specified anywhere, so just try to be consistent.
