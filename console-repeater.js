;(function () {
  const ConsoleRepeater = {}

  ConsoleRepeater.extend = function (consoleObj) {
    var loggers = {}
    var logging = false
    var logCounter = 0

    var originalLoggers = {}

    ;['log', 'warn', 'info', 'trace', 'error'].forEach(function (methodName) {
      originalLoggers[methodName] = consoleObj[methodName]

      consoleObj[methodName] = function () {
        try {
          // First this, so trouble in the extended behavior won't
          // prevent the original one
          originalLoggers[methodName].apply(consoleObj, arguments)

          if (logging) {
            // _logging is true when a logger is running; if that's
            // the case, return early, or else we end up in a loop.
            return
          }

          var args = Array.prototype.slice.call(arguments)

          for (var loggerName in loggers) {
            var logger = loggers[loggerName]

            try {
              logging = true
              logger.handle(methodName, args)
            } catch (err) {
              // Catch problems in handlers
              originalLoggers['error'].call(consoleObj, err)
            } finally {
              logging = false
            }
          }
        } catch (err) {
          // Catch problems in Multiplexer itself
          originalLoggers['error'].call(consoleObj, err)
        }
      }
    })

    console.repeater = {}

    console.repeater.add = function (logger) {
      var name = '_logger_' + logCounter++
      console.repeater.set(name, logger)
      return name
    }

    console.repeater.set = function (name, logger) {
      if (typeof logger === 'object' &&
          typeof logger.handle === 'function') {
        loggers[name] = logger
      } else if (typeof logger === 'function') {
        loggers[name] = { handle: logger }
      }
    }

    console.repeater.remove = function (name) {
      delete loggers[name]
    }
  }

  // ON-SCREEN CONSOLE
  // ----------------------------------------------------------------------

  ConsoleRepeater.OSD = function () {
    addCSS(cssObjectToString({
      '.osd-console': {
        'position': 'fixed',
        'z-index': '3000',
        'bottom': '0',
        'left': '0',
        'right': '0',
        'height': '8rem',
        'overflow': 'hidden',
        'display': 'none',
        'background': 'black',
        'list-style-type': 'none',
        'padding-left': '2px'
      },

      '.osd-console-message': {
        'text-indent': '1rem',
        'color': 'white',
        'font-weight': 'bold',
        'font-family': 'monospace',
        'margin': '3px 0',
        'padding': '0',
        'font-size': '0.6rem',
        'word-break': 'break-all'
      }
    }))

    this._counter = 0
    this._element = document.createElement('div')
    this._element.setAttribute('class', 'osd-console')
    this._element.style.display = 'block'
    document.body.appendChild(this._element)
  }

  ConsoleRepeater.OSD.prototype.handle = function (level, args) {
    if (this._element.style.display === 'block') {
      var message = this._counter++ + ' [' + level + '] ' + args.join(' ')
      var messageEl = document.createElement('div')
      messageEl.setAttribute('class', 'osd-console-message')
      messageEl.textContent = message
      this._element.appendChild(messageEl)
      this._element.scrollTop = this._element.scrollHeight
    }
  }

  ConsoleRepeater.OSD.prototype.display = function () {
    this._element.style.display = 'block'
  }

  ConsoleRepeater.OSD.prototype.hide = function () {
    this._element.style.display = 'none'
  }

  // UTILITIES
  // ----------------------------------------------------------------------

  function cssObjectToString (cssObject) {
    var s = ''
    for (var selector in cssObject) {
      s += selector + ' {\n'
      var properties = cssObject[selector]
      for (var property in properties) {
        var value = properties[property]
        s += '  ' + property + ': ' + value + ';\n'
      }
      s += '}\n\n'
    }
    return s
  }

  function addCSS (cssText) {
    var head = document.getElementsByTagName('head')[0]
    var styleElement = document.createElement('style')
    styleElement.setAttribute('type', 'text/css')
    if (styleElement.styleSheet) {
      styleElement.styleSheet.cssText = cssText
    } else {
      styleElement.appendChild(document.createTextNode(cssText))
    }
    head.appendChild(styleElement)
  }

  // EXPORTS
  // ----------------------------------------------------------------------

  window.ConsoleRepeater = ConsoleRepeater
})()
