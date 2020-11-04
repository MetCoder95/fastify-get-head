const fp = require('fastify-plugin')

function ignorePath (path, pathsToIgnore) {
  if (Array.isArray(pathsToIgnore)) {
    return pathsToIgnore.some((predicate) =>
      predicate instanceof RegExp
        ? predicate.test(path)
        : typeof predicate === 'string'
          ? predicate === path
          : false
    )
  }

  // If is regex
  if (pathsToIgnore instanceof RegExp) return pathsToIgnore.test(path)

  // Plain string
  if (typeof pathsToIgnore === 'string') return pathsToIgnore === path
}

function onSendHandler (req, reply, payload, done) {
  // If is a stream, we remove any header without appending
  // content-length one, and resume it right away
  if (typeof payload.resume === 'function') {
    reply.removeHeader('content-type')
    payload.resume()
    return done(null, null)
  }

  const size = '' + Buffer.byteLength(payload)

  reply.header('content-length', size)

  done(null, null)
}

function getSetupHeadRoutingForGet (fastify, pathsToIgnore) {
  return function setupHeadRouteForGet (routeOpts) {
    const {
      method,
      path,
      url,
      handler,
      prefix,
      routePath,
      ...routeConfig
    } = routeOpts
    const isNotGetMethod = method !== 'GET'
    const shouldIgnore = pathsToIgnore && ignorePath(path, pathsToIgnore)

    // Only GET routes and allowed paths
    if (isNotGetMethod || shouldIgnore) return

    fastify.route({
      ...routeConfig,
      path,
      handler,
      method: 'HEAD',
      onSend: onSendHandler
    })
  }
}

function plugin (fastify, opts = {}, done) {
  const pathsToIgnore = opts !== null && opts.ignorePaths

  fastify.addHook('onRoute', getSetupHeadRoutingForGet(fastify, pathsToIgnore))

  done()
}

module.exports = fp(plugin, {
  fastify: '>=3',
  name: 'fastify-get-head'
})