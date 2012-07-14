/** This plugin is special-cased and gets direct access to the client.
 *  Unlike other plugins, uncaught errors will therefore crash the client.
 *  None of these commands are required, they are merely working examples.
 */
const fmt   = require( "util" ).format
    , path  = require( "path" )
    , irc   = require( "irc-js" )
 
const load = function( client ) {
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

  client.lookFor( fmt( "^:(?:\\b%s\\b[\\s,:]+|[@!\\/?\\.])(?:quit|shutdown|die|disconnect) ?(.+)?", client.user.nick )
             , function( msg, partingWords ) {
    client.quit( partingWords || fmt( "%s told me to quit, goodbye!", msg.from.nick ) )
  })

  client.lookFor( fmt( "^:(?:\\b%s\\b[\\s,:]+|[@!\\/?\\.])(?:part|leave|gtfo)(?: +([+!#&][^ ]+))?(?: (.+))?", client.user.nick )
             , function( msg, name, txt ) {
    const chan = client.channels.get( irc.id( name || msg.params[0] ) )
        , from = msg.from.nick
    if ( ! chan )
      return msg.reply( "%s, I’m not in %s.", from, name )
    chan.part( txt ? txt.trim() : fmt( "%s told me to leave. Bye!", from ) )
    if ( chan.name !== msg.params[0] )
      msg.reply( "%s, I have left %s.", from, chan.name )
  })

  client.lookFor( fmt( "^:(?:\\b%s\\b[\\s,:]+|[@!\\/?\\.])(?:join) +([+!#&][^ ]+)(?: +([^ ]+))?", client.user.nick )
                , function( msg, name, key ) {
    const chan = client.channels.get( irc.id( name ) )
        , from = msg.from.nick
    if ( chan && chan.name === msg.params[0] )
      return msg.reply( "%s, I am already here!", from )
    else if ( chan )
      return msg.reply( "%s, I am already in %s, and I can prove it. The topic is as follows. %s"
                      , from, name, chan.topic || "Hmm, appears to be empty." )
    client.join( name, key, function( chan, err ) {
      if ( err ) {
        msg.reply( "%s, there was an error when I tried to join %s. Server said “%s”.", from, name, err.message )
        return
      }
      msg.reply( "%s, I am now in %s%s", from, name, key ? fmt( ", I used “%s” to get in.", key ) : "." )
    })
  })

  client.lookFor( fmt( "^:(?:\\b%s\\b[\\s,:]+|[@!\\/?\\.])(?:say) +([+!#&][^ ]+) +(.+)", client.user.nick )
             , function( msg, chan, stuff ) {
    const ch = client.channels.get( irc.id( chan ) )
    if ( ch )
      return ch.say( stuff )
    msg.reply( "%s, I’m not in %s.", msg.from.nick, chan )
  })

  client.lookFor( fmt( "^:(?:\\b%s\\b[\\s,:]+|[@!\\/?\\.])(?:help)", client.user.nick )
                , function( msg, chan, stuff ) {
    msg.reply( "%s, I offer no help, yet. Help me help you: https://github.com/nlogax/ircjsbot/blob/master/%s#L%s"
             , msg.from.nick, path.basename( __filename ), module.__linenumber - 4 )
  })
  return irc.STATUS.SUCCESS
}

const eject = function() {
  /** @todo Make it easier to remove observers.
   *  Perhaps adding an observer should return an object that can remove it?
   *  Either that or allow a prefix, so that a plugin can remove everything it registered.
   */
  return irc.STATUS.SUCCESS
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

exports.name  = "Core"
exports.load  = load
exports.eject = eject
