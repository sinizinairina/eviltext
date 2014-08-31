module.exports =
  # Assigning weighting to tags, build tag cloud.
  assignLogWeights: (tagCloud, minSize = 90, maxSize = 150) ->
    counts = _(tagCloud).pluck('count')
    maxCount = _(counts).max()
    minCount = _(counts).min()
    constant = Math.log(maxCount - (minCount - 1))/(maxSize - minSize || 1)
    for tag in tagCloud
      weight = minSize + Math.log(tag.count - (minCount - 1))/constant
      tag.weight = Math.round(weight)

  postprocessHtml: (html, {path, replaceRelativePaths, lazyImages}) ->
    cheerio  = require 'cheerio'
    $ = cheerio.load html

    # Replacing paths.
    base = path.replace /\/[^\/]+$/, ''
    if replaceRelativePaths and not (base == '/' or base == '')
      $('a').each -> e = $(@); e.attr 'href', app.pathUtil.expandRelativePath(e.attr('href'), base)
      $('img').each -> e = $(@); e.attr 'src', app.pathUtil.expandRelativePath(e.attr('src'), base)

    # Making images lazy.
    if lazyImages
      emptyImage = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
      $('img').each ->
        e = $(@)
        e.attr 'data-src', e.attr('src')
        e.attr 'src', emptyImage
        e.attr 'onload', "lazyImage(this)"

    html = $.html()

  parseHtml: (html) ->
    convert = (e) ->
      switch e.type
        when 'tag'
          type       : e.name
          attributes : e.attribs || {}
          children   : (convert child for child in e.children)
        when 'text'
          type : 'text'
          text : e.data
        # TODO fix it, return correct type in case of script tag.
        when 'script'
          type : 'text'
          text : ''
        when 'comment'
          type : 'text'
          text : ''
        else
          app.warn "unknown element type '#{e.type}'!"
          type : 'text'
          text : ''

    cheerio  = require 'cheerio'
    $ = cheerio.load html
    return (convert(child) for child in $._root.children)

  buildHtml: (nodes) ->
    cheerio  = require 'cheerio'
    $ = cheerio.load '<div>'
    convert = (node) ->
      switch node.type
        when 'text' then node.text
        else
          e = $ "<#{node.type}>"
          e.attr name, value for name, value of node.attributes
          e.append(convert(child)) for child in node.children
          e

    root = $('div').first()
    root.append convert(node) for node in nodes
    root.html()

  truncateText: (text, options={}) ->
    # Skipping, because althoug it will be slower, code will be better tested.
    # return text if text.length <= options.max

    spaceRe = /\s/

    # Splitting text into array of spaces and words.
    [tokens, type, buff] = [[], null, []]
    for i in [0..(text.length - 1)]
      char = text.charAt i
      if spaceRe.test char
        if type != 'space'
          tokens.push buff.join('') if buff.length > 0
          type = 'space'
          buff = []
        buff.push char
      else
        if type != 'word'
          tokens.push buff.join('') if buff.length > 0
          type = 'word'
          buff = []
        buff.push char
    tokens.push buff.join('') if buff.length > 0

    # Truncating.
    [result, length, truncated, hasAtLeastOneWord] = [[], 0, false, false]
    for token, i in tokens
      if spaceRe.test token
        if i == 0 or i == (tokens.length - 1)
          # Not counting first and last space.
          result.push token
        else
          if length + 1 <= options.max
            length += 1
            result.push token
          else
            truncated = true
            break
      else
        if length + token.length <= options.max
          length += token.length
          result.push token
        else
          # If even first word is too big to fit breaking it.
          unless hasAtLeastOneWord
            availableLength = options.max - length
            token = token[0..(availableLength - 1)]
            length += token.length
            result.push token
          truncated = true
          break
        hasAtLeastOneWord = true

    # Removing last space in truncated result.
    lastToken = result[result.length - 1]
    if (result.length > 0) and (length > 0) and truncated and spaceRe.test(lastToken)
      result.pop()
      length -= 1

    [result.join(''), length, truncated]

  # Ignores start and end whitespace and counts multiple inner whitespaces as one.
  symbolLength: (text) -> _s.strip(text).split(/\s/).join(' ').length

  truncateHtml: (html, options={}) ->
    options.predefined ?= {}

    onlySpaceRe = /^\s+$/
    nodes = @parseHtml html

    # Check if node is inline code, if it's a plain text inside of code without linebreaks.
    isInlineCode = (node) ->
      (node.type == 'code') and (node.children.length == 1) \
      and (node.children[0].type == 'text') and not /\n/.test(node.children[0].text)

    totalLength = 0
    # Space also should be counted between elements.
    firstElementWithLength = true
    convert = (node) ->
      if node.type == 'text'
        length = module.exports.symbolLength node.text
        length += 1 unless firstElementWithLength

        # Skipping text elements of empty spaces.
        if onlySpaceRe.test node.text
          [node, false]
        else if totalLength + length <= options.max
          totalLength += length
          firstElementWithLength = false
          [node, false]
        else
          # In case when truncated text will be too small if we reject the whole text
          # breaking text into words and truncating by words.
          if options.min and totalLength < options.min
            maxLength = options.max - totalLength
            maxLength -= 1 unless firstElementWithLength
            [text, length, tmp...] = module.exports.truncateText node.text, max: maxLength
            length += 1 unless firstElementWithLength
            totalLength += length
            firstElementWithLength = false
            [{type: 'text', text: text}, true]
          else
            [null, true]
      else if options.predefined and (length = options.predefined[node.type]) \
      and not isInlineCode(node)
        length += 1 unless firstElementWithLength
        if totalLength + length <= options.max
          totalLength += length
          firstElementWithLength = false
          [node, false]
        else
          [null, true]
      else
        if node.children.length > 0
          convertedNode = {type: node.type, attributes: node.attributes, children: []}

          truncated = false
          for child in node.children
            [convertedChild, truncated] = convert child
            convertedNode.children.push convertedChild if convertedChild
            break if truncated

          # If all children where rejected the node itself also should be rejected.
          if convertedNode.children.length > 0 then [convertedNode, truncated]
          else [null, true]
        else
          [node, false]

    truncated = false
    convertedNodes = []
    for node in nodes
      [convertedNode, truncated] = convert node
      convertedNodes.push convertedNode if convertedNode
      break if truncated

    [@buildHtml(convertedNodes), totalLength, truncated]

  smartHtmlTruncate: (html, max) ->
    @truncateHtml html,
      max        : max
      # Should be at least 2/3 of max.
      min        : Math.ceil(2 * max / 3)
      # Allowing only one image or code block.
      predefined :
        img    : Math.ceil(max / 2) + 1
        pre    : Math.ceil(max / 2) + 1
        code   : Math.ceil(max / 2) + 1
        iframe : Math.ceil(max / 2) + 1

  textLengthInString: (string) ->
    # http://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
    # Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
    match = encodeURIComponent(string).match(/%[89ABab]/g)
    string.length + (if match then match.length else 0)

  generateId: (length) ->
    length  ?= 16
    symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    [id, count] = ["", length + 1]
    while count -= 1
      rand = Math.floor(Math.random() * symbols.length)
      id += symbols[rand]
    id