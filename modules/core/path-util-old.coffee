# TODO simplify and rewrite with js.
app.pathUtil =
  relativePath: (rootPath, path) ->
    if rootPath == '/'       then path
    else if path == rootPath then '/'
    else path.replace rootPath, ''

  absolutePath: (rootPath, path = '/') ->
    if rootPath == '/'  then path
    else if path == '/' then rootPath
    else "#{rootPath}#{path}"

  absolutePathIfNotAbsolute: (rootPath, path) ->
    if /^\/|^http:\/\/|^https:\/\/|^mailto:/.test path then path
    else @absolutePath(rootPath, "/#{path}")

  # # Split path into base and extension.
  # splitIntoBaseAndExtension: (fullPath) ->
  #   if match = /\.([a-z0-9]+)$/i.exec(fullPath)
  #     extension = match[1]
  #     path = fullPath[0..(fullPath.length - 1 - 1 - extension.length)]
  #     [path, extension]
  #   else
  #     [fullPath, null]

  # split: (path) ->
  #   return ['/'] if path == '/'
  #   parts = path.split('/')
  #   parts[0] = '/' if parts[0] == ''
  #   parts

  join: (args...) ->
    args.join('/').replace(/\/\/\/?/g, '/')

  # nextChildPath: (currentPath, path) ->
  #   return null if currentPath == path
  #   [currentParts, pathParts] = [@split(currentPath), @split(path)]
  #   @join pathParts[0..currentParts.length]

  # splitIntoParentAndChildrenPaths: (path) ->
  #   parts = @split path
  #   if parts.length > 1 then [parts[0], parts[1..(parts.length - 1)].join('/')]
  #   else [parts[0], null]

  parentPath: (path) ->
    if !path or path == '/' then null
    else path.replace(/\/[^\/]+$/, '') || '/'

  # childrenPath: (path) ->
  #   if parentPath = @parentPath(path) then path.replace parentPath, ''
  #   else null

  # name: (path) -> if path == '/' then '/' else _(path.split('/')).last()

  expandRelativePath: (path, base) ->
    throw new Error "can't expand path #{path}, no base!" unless base
    return path if !path? or _.isBlank(path) or /^\/|^#|^[a-z]+:/.test(path)
    if /^\.\//.test path then path.replace /^\./, base
    else "#{base}#{if base == '/' then '' else '/'}#{path}"

  isImagePath: (path) ->
    /\.(png|jpg|jpeg|bmp|svf)$/.test path

  # isObject: (path, options={}) ->
  #   prefix = options.prefix || ''
  #   if options.allowDate
  #     # Allow files in folders with names of year, month and day.
  #     re = ///^#{prefix}(\/\d{4}\/\d{2}\/\d{2}|\/\d{4}\/\d{2}|\/\d{4})?\/([^\/]+)$///
  #     if matched = re.exec(path)
  #       # Name should contain at least one non-digit character.
  #       /[^\d]/.test matched[2].replace(/\s/, '')
  #     else false
  #   else
  #     if matched = ///^#{prefix}\/([^\/]+)$///.exec(path)
  #       # Name should contain at least one non-digit character.
  #       /[^\d]/.test matched[1].replace(/\s/, '')
  #     else false
  #
  # isCollection: (path, options={}) ->
  #   prefix = options.prefix || ''
  #   if options.allowDate
  #     # Allow names of year, month and day in path.
  #     re = ///^#{prefix}(\/\d{4}\/\d{2}\/\d{2}|\/\d{4}\/\d{2}|\/\d{4})?\/([^\/]+)\/[^\/]+$///
  #     if matched = re.exec(path)
  #       # Name should contain at least one non-digit character.
  #       /[^\d]/.test matched[2].replace(/\s/, '')
  #     else false
  #   else
  #     if matched = ///^#{prefix}\/([^\/]+)\/[^\/]+$///.exec(path)
  #       # Name should contain at least one non-digit character.
  #       /[^\d]/.test matched[1].replace(/\s/, '')
  #     else false

  buildUrl: (path, params={}) ->
    # Rejecting empty pareters.
    oldParams = params
    params    = {}
    params[k] = v for k, v of oldParams when k? and v?

    # Processing `host`, `port`, `protocol` and `format` specially.
    if params.host
      host = params.host
      delete params.host
    if params.port
      port = params.port
      delete params.port
    if params.protocol
      protocol = params.protocol
      delete params.protocol
    else
      protocol = 'http'

    if params.format
      format = params.format
      delete params.format
    # else
    #   format = 'html'

    # Building url.
    # path = encodeURI path
    if host
      portStr = if port and port != 80 and port != '80' then ':' + port else ''
      path = "#{protocol}://#{host}#{portStr}#{if path == '/' then '' else path}#{}"

    path = "#{path}.#{format}" if format #!= 'html'

    # Removing index, because we don't need it, the path without index is the same.
    # path = path.replace(/\/index$/, '') if !format && /\/index$/.test(path)

    if _(params).size() > 0
      delimiter = if /\?/.test(path) then '&' else '?'
      buff = []
      for k, v of params
        buff.push "#{encodeURIComponent(k.toString())}=#{encodeURIComponent(v.toString())}"
      path + delimiter + buff.join('&')
    else
      path

app.path = app.pathUtil.buildUrl