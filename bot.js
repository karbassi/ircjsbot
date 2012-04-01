const path = require( "path" )
    , fmt  = require( "util" ).format
    , irc  = require( "irc" )
    , seen = require( "./plugins/seen" )
    , tell = require( "./plugins/tell" )
    , IRC  = irc.IRC

const conf = path.join( __dirname, process.argv[2] || "config.json" )

const bot = new IRC( conf )

// Add "plugins" :)
// @todo {jonas} Make a proper plugin interface, either here or in IRC-js
seen.register( bot )
tell.register( bot )

bot.connect( function( srv ) {
  // Perhaps change `channels.add()` to return `this`,
  // so that you can `channels.add( "#foo" ).add( "#bar" ).add( "#baz" )`
  // Also, make it possible to specify default channels in conf.
  bot.channels.add( "#html5" )
  bot.channels.add( "#jquery" )
  bot.channels.add( "#jquery-dev" )
  bot.channels.add( "#jquery-meeting" )
  bot.channels.add( "#jquery-ot" )
  bot.channels.add( "#runlevel6" )
})

bot.lookFor( fmt( " *@?%s *:? *(you(?:['’]?re)?|u(?: r)|ur?) +([^?]+)", bot.user.nick )
           , function( msg, you, remark ) {
  const wittyReply = fmt( "%s, no %s %s", msg.from.nick
                        , you.toUpperCase(), remark )
  msg.reply( wittyReply )
})

bot.observe( irc.COMMAND.INVITE, function( msg ) {
  // Some clients send chan name as a trailing param :(
  const name = msg.params[1].replace( /^:/, "" )
  bot.channels.add( name, function( ch, err ) {
    if ( err )
      return
    ch.say( fmt( "Thanks for inviting me, %s", msg.from.nick ) )
  })
})

bot.lookFor( fmt( "@?%s[: ]+(?:quit|shutdown|die|disconnect) ?(.+)?", bot.user.nick )
           , function( msg, partingWords ) {
  bot.quit( partingWords || fmt( "%s told me to quit, goodbye!", msg.from.nick ) )
})

bot.lookFor( fmt( "@?%s[: ]+(?:part|leave|gtfo)(?: +([+!#&][^ ]+))?(?: (.+))?", bot.user.nick )
           , function( msg, name, txt ) {
  const chan = bot.channels.get( name || msg.params[0] )
      , from = msg.from.nick
  if ( ! chan )
    return msg.reply( fmt( "%s, I’m not in %s.", from, name ) )
  chan.part( txt ? txt.trim() : fmt( "%s told me to leave. Bye!", from ) )
  if ( chan.name !== msg.params[0] )
    msg.reply( fmt( "%s, I have left %s.", from, chan.name ) )
})

bot.lookFor( fmt( "@?%s[: ]+(?:join|add) +([+!#&][^ ]+)(?: +([^ ]+))?", bot.user.nick )
           , function( msg, name, key ) {
  const chan = bot.channels.get( name )
      , from = msg.from.nick
  if ( chan && chan.name === msg.params[0] )
    return msg.reply( fmt( "%s, I am already here!", from ) )
  else if ( chan )
    return msg.reply( fmt( "%s, I am already in %s, and I can prove it. The topic is as follows. %s"
                         , from, name, chan.topic || "Hmm, appears to be empty." ) )
  bot.channels.add( name, key, function( chan, err ) {
    if ( err ) {
      msg.reply( fmt( "%s, there was an error when I tried to join %s. Server said “%s”.", from, name, err.message ) )
      return
    }
    msg.reply( fmt( "%s, I am now in %s%s", from, name, key ? fmt( ", I used “%s” to get in.", key ) : "." ) )
  })
})

bot.lookFor( fmt( "@?%s[: ]+(?:say) +([+!#&][^ ]+) +(.+)", bot.user.nick )
           , function( msg, chan, stuff ) {
  const ch = bot.channels.get( chan )
  if ( ch )
    return ch.say( stuff )
  msg.reply( fmt( "%s, I’m not in %s.", msg.from.nick, chan ) )
})
