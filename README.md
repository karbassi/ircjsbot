# About
This is an IRC client/bot, its main purpose is to test the [experimental branch](https://github.com/gf3/IRC-js/tree/nlogax/experimental) of IRC-js.

## Installation
Clone the repository, run `npm install` in the root folder of the repository.

## Usage
The configuration file, [`config.json`](/nlogax/ircjsbot/blob/master/config.json), lets you specify default channels to join, nickname, etc.
The main script, [`bot.js`](/nlogax/ircjsbot/blob/master/bot.js), takes an optional command line argument: the path to the configuration file.
You can then run it like this: `node --harmony bot.js config-dev.json`, or omit the argument and use the [default `config.json`](/nlogax/ircjsbot/blob/master/config.json).

There is a plugin API in development, you can look at example plugins in the [plugins](/nlogax/ircjsbot/tree/master/plugins) folder.

## Contributing
Things that need work, which would improve IRC-js and this project a lot:

* Go through the various IRC commands and make sure that the corresponding handlers in IRC-js handle them properly.
* Especially the ones that involve channels and users, so that we have a consistent and correct view of them. 
* Expand upon the mock IRC server, making it more like an actual server. Would make testing a lot nicer.
* Make nice plugins, and fix or report things that suck about the API.

While developing, use the `--use_strict --harmony` V8 options.
Prefer `const` over `let` or `var` wherever possible.

The bot uses the same code style as IRC-js. It is not specified anywhere, so just try to be consistent.
