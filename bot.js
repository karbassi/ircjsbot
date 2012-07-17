const path    = require( "path" )
    , irc     = require( "irc-js" )
    , Client  = irc.Client

const conf    = path.join( __dirname, process.argv[ 2 ] || "config.json" )
    , logger  = irc.logger.get( "ircjs" )
    // We'll look here, in addition to Node's existing paths, for modules
    , plugDir = path.join( __dirname, "plugins" )

// I'll just let this live here until I know where they should be.
const plugins = {}

const client = new Client( conf )

client.connect( function( srv ) {
  client.config.channels.forEach( function( cn ) {
    client.join( cn )
  })
})

client.observe( irc.EVENT.DISCONNECT, function( msg ) {
  var k
  for ( k in plugins )
    if ( plugins.hasOwnProperty( k ) ) {
      plugins[ k ].eject()
      delete plugins[ k ]
    }
  process.exit()  // @todo wait for plugins to signal?
})

/** Since we don't have interfaces or equivalent, the imaginary Plugin interface is described here.
    Each plugin is a module, exporting itself as the module object. It may use submodules internally.

    This object should conform to the following interface:

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

/** This is ugly, but the general idea seems nice.
 *  Goes between the Client instance and the plugin, adding a tiny bit of safety.
 *  @constructor
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
        return cb.apply( cb, arguments )
      } catch ( e ) {
        logger.debug( e, e.stack )
        msg.reply( "Plugin %s threw an error: %s"
          , plugin.name, e.toString() )
      }
    } )
  }

  this.lookFor = function(/* cmd, pattern, cb */) {
    const args = []
    args.push.apply( args, arguments )
    const cb = args.pop()
        , safecb = function( msg /*oldcb, args...*/ ) {
      try {
        return cb.apply( cb, arguments )
      } catch ( e ) {
        logger.debug( e, e.stack )
        msg.reply( "Plugin %s threw an error: %s"
          , plugin.name, e.toString() )
      }
    }
    args.push( safecb )
    client.lookFor.apply( client, args )
  }
}

/** Load plugins, if any
 *  I want to add `plugDir' to Node's module paths, tried many different ways
 *  but it seems module.js has decided on an array of paths before there's a
 *  chance to do anything about it, and it's not exported.
 *  Hardcoding it to look *only* there instead, for the time being.
 */
if ( client.config[ "plugins" ] )
  client.config[ "plugins" ].forEach( function( plugName ) {
    const plugin = require( path.join( plugDir, plugName ) )
        // Hmm, I don't like having to create a new one for each plugin...
        , mediator = new Mediator( client, plugin )
    const status = plugin.load( mediator )
    if ( irc.STATUS.SUCCESS ) {
      logger.debug( "Plugin %s loaded successfully", plugin.name )
      plugins[ plugin.name ] = plugin
    } else
      logger.debug( "Plugin %s failed to load", plugin.name )
  } )

/** Core is a privileged plugin, with access to full client.
 *  It also does many silly things, so we load it last, giving useful commands
 *  the opportunity to STATUS.STOP them.
 *  @todo I don't like that it's hardcoded like this, would be nice if plugins
 *        had privileges, so that it could live in the plugins repo, and would
 *        not need this additional code.
 */
const corePlugin = require( path.join( __dirname, "core" ) )
corePlugin.load( client )
