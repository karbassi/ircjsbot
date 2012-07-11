const path    = require( "path" )
    , fmt     = require( "util" ).format
    , irc     = require( "irc-js" )
    , Client  = irc.Client

const conf = path.join( __dirname, process.argv[2] || "config.json" )

const logger = irc.logger.get( "ircjs" )

// I'll just let this live here until I know where they should be.
const plugins = {}
const pluginPath = path.join( __dirname, "plugins" )  // Should go in config perhaps?

const client = new Client( conf )

client.connect( function( srv ) {
  client.config.channels.forEach( function( cn ) {
    client.join( cn )
  })
  client.config.plugins.forEach( function( plugName ) {
    const plugin = require( path.join( pluginPath, plugName ) )
        // Hmm, I don't like having to create a new one for each plugin...
        , mediator = new Mediator( client, plugin )
    const status = plugin.load( mediator )
    if ( irc.STATUS.SUCCESS ) {
      logger.log( irc.LEVEL.DEBUG, fmt( "Plugin %s loaded successfully", plugin.name ) )
      plugins[ plugin.name ] = plugin
    } else
      logger.log( irc.LEVEL.DEBUG, fmt( "Plugin %s failed to load", plugin.name ) )
  })
})

client.observe( irc.EVENT.DISCONNECT, function( msg ) {
  var k;
  for ( k in plugins )
    if ( plugins.hasOwnProperty( k ) ) {
      plugins[ k ].eject()
      delete plugins[ k ]
    }
  process.exit()  // @todo wait for plugins to signal?
})

client.lookFor( fmt( "%s.+\\b(you(?:['’]?re)?|u(?: r)|ur?) +([^?]+)", client.user.nick )
              , function( msg, you, remark ) {
  const wittyReply = fmt( "%s, no %s %s", msg.from.nick
                        , you.toUpperCase(), remark )
  msg.reply( wittyReply )
})

client.observe( irc.COMMAND.INVITE, function( msg ) {
  // Some clients send chan name as a trailing param :(
  const name = msg.params[1].replace( /^:/, "" )
  client.join( name, function( ch, err ) {
    if ( err )
      return
    ch.say( fmt( "Thanks for inviting me, %s", msg.from.nick ) )
  })
})

client.lookFor( fmt( "%s.+\\b(?:quit|shutdown|die|disconnect) ?(.+)?", client.user.nick )
           , function( msg, partingWords ) {
  client.quit( partingWords || fmt( "%s told me to quit, goodbye!", msg.from.nick ) )
})

client.lookFor( fmt( "%s.+\\b(?:part|leave|gtfo)(?: +([+!#&][^ ]+))?(?: (.+))?", client.user.nick )
           , function( msg, name, txt ) {
  const chan = client.channels.get( irc.id( name || msg.params[0] ) )
      , from = msg.from.nick
  if ( ! chan )
    return msg.reply( fmt( "%s, I’m not in %s.", from, name ) )
  chan.part( txt ? txt.trim() : fmt( "%s told me to leave. Bye!", from ) )
  if ( chan.name !== msg.params[0] )
    msg.reply( fmt( "%s, I have left %s.", from, chan.name ) )
})

client.lookFor( fmt( "%s.+\\b(?:join|add) +([+!#&][^ ]+)(?: +([^ ]+))?", client.user.nick )
              , function( msg, name, key ) {
  const chan = client.channels.get( irc.id( name ) )
      , from = msg.from.nick
  if ( chan && chan.name === msg.params[0] )
    return msg.reply( fmt( "%s, I am already here!", from ) )
  else if ( chan )
    return msg.reply( fmt( "%s, I am already in %s, and I can prove it. The topic is as follows. %s"
                         , from, name, chan.topic || "Hmm, appears to be empty." ) )
  client.join( name, key, function( chan, err ) {
    if ( err ) {
      msg.reply( fmt( "%s, there was an error when I tried to join %s. Server said “%s”.", from, name, err.message ) )
      return
    }
    msg.reply( fmt( "%s, I am now in %s%s", from, name, key ? fmt( ", I used “%s” to get in.", key ) : "." ) )
  })
})

client.lookFor( fmt( "%s.+\\b(?:say) +([+!#&][^ ]+) +(.+)", client.user.nick )
           , function( msg, chan, stuff ) {
  const ch = client.channels.get( irc.id( chan ) )
  if ( ch )
    return ch.say( stuff )
  msg.reply( fmt( "%s, I’m not in %s.", msg.from.nick, chan ) )
})

client.lookFor( fmt( "%s.+\\b(?:help)", client.user.nick )
              , function( msg, chan, stuff ) {
  msg.reply( fmt( "%s, I offer no help, yet. Help me help you: "
                + "https://github.com/nlogax/ircjsbot/blob/master/%s#L%s"
                , msg.from.nick, path.basename( __filename ), module.__linenumber - 4 ) )
})

/** Since we don't have interfaces or equivalent, the imaginary Plugin interface is described here.
    Each plugin is a module, exporting itself as the module object. It may use submodules internally.

    This object should implement the following interface:

      @property {string}                        name
        Human-readable plugin name. If not present, the module name is used.
        Currently only used when publically shaming buggy plugins.

      @property {function(Client):irc.STATUS}   load
        Perform required initialization work, if any. Return an irc.STATUS so we know how it went.

      @property {function(Client):irc.STATUS}   eject
        Perform finalization work, e.g. disconnect from DB, close file handles, etc.
        If you're an overachiever, perhaps use the log generously, and collect it here.
        Return an appropriate irc.STATUS.
 */

/** @constructor This is ugly, but the general idea seems nice.
 *  Goes between the Client instance and the plugin, adding a tiny bit of safety.
 *  @param {Client} client
 *  @param {Plugin} plugin
 */
const Mediator = function( client, plugin ) {
  // Show some stuuuff...
  this.user = client.user
  this.channels = client.channels

  this.observe = function( cmd, cb ) {
    client.observe( cmd, function( msg ) {
      try {
        cb.apply( cb, arguments )
      } catch ( e ) {
        logger.log( irc.LEVEL.DEBUG, e, e.stack )
        msg.reply( fmt( "Plugin %s threw an error: %s"
          , plugin.name, e.toString() ) )
      }
    } )
  }

  this.lookFor = function(/* cmd, pattern, cb */) {
    const args = []
    args.push.apply( args, arguments )
    const cb = args.pop()
        , safecb = function( msg /*oldcb, args...*/ ) {
      try {
        cb.apply( cb, arguments )
      } catch ( e ) {
        logger.log( irc.LEVEL.DEBUG, e, e.stack )
        msg.reply( fmt( "Plugin %s threw an error: %s"
          , plugin.name, e.toString() ) )
      }
    }
    args.push( safecb )
    client.lookFor.apply( client, args )
  }
}

// I'll hide this and my shame down here.
Object.defineProperty( module, "__linenumber", { get: function() {
  const e = new Error()
      , l = e.stack.split( '\n' )
  var i = l.length
  while ( i-- ) {
    if ( -1 === l[ i ].indexOf( __filename ) )
      continue
    return l[ i ].split( ':' )[ 1 ]
  }
} } )
