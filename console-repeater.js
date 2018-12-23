;(function () {
  var ConsoleRepeater = {}

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
          // Catch problems in repeater itself
          console.log(originalLoggers)
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

  // Maximum amount of messages to save if OSD console was
  // instantiated but not added to DOM yet
  var OSD_BACKLOG_SIZE = 10

  ConsoleRepeater.OSD = function (opts) {
    if (!opts) {
      opts = {}
    }

    this._counter = 0
    this._backlog = []
    this._popupOnLogLevels = opts.popupOnLogLevels || []

    this._initDom()
    this._initCss()
  }

  ConsoleRepeater.OSD.prototype._initCss = function () {
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
        'word-break': 'break-all',
        'white-space': 'pre-wrap'
      }
    }))
  }

  ConsoleRepeater.OSD.prototype._initDom = function () {
    this._element = document.createElement('div')
    this._element.setAttribute('class', 'osd-console')

    if (document.body) {
      document.body.appendChild(this._element)
      this._replayBacklog()
    } else {
      const self = this
      if (document.attachEvent) {
        document.attachEvent('onreadystatechange', function () {
          if (document.readyState === 'complete') {
            document.body.appendChild(self._element)
            self._replayBacklog()
          }
        })
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          document.body.appendChild(self._element)
          self._replayBacklog()
        })
      }
    }
  }

  ConsoleRepeater.OSD.prototype._replayBacklog = function () {
    while (this._backlog.length > 0) {
      var backlogEntry = this._backlog.shift()
      var level = backlogEntry[0]
      var args = backlogEntry[1]
      this.handle(level, args)
    }
  }

  ConsoleRepeater.OSD.prototype._storeInBacklog = function (level, args) {
    if (this._backlog.length > OSD_BACKLOG_SIZE) {
      this._backlog.shift()
    }
    this._backlog.push([level, args])
  }

  ConsoleRepeater.OSD.prototype._isReady = function () {
    return !!this._element
  }

  ConsoleRepeater.OSD.prototype._appendMessage = function (level, args) {
    if (!this.isVisible() &&
        this._popupOnLogLevels.indexOf(level) !== -1) {
      this.display()
    }

    var message = this._counter++
        + ' [' + level + '] '
        + format(args).replace(/\n/g, '\n...... ')
    var messageEl = document.createElement('div')
    messageEl.setAttribute('class', 'osd-console-message')
    messageEl.textContent = message
    this._element.appendChild(messageEl)
    this._element.scrollTop = this._element.scrollHeight
  }

  ConsoleRepeater.OSD.prototype.handle = function (level, args) {
    if (this._isReady()) {
      this._appendMessage(level, args)
    } else {
      this._storeInBacklog(level, args)
    }
  }

  ConsoleRepeater.OSD.prototype.isVisible = function () {
    return this._element.style.display === 'block'
  }

  ConsoleRepeater.OSD.prototype.display = function () {
    this._element.style.display = 'block'
  }

  ConsoleRepeater.OSD.prototype.hide = function () {
    this._element.style.display = 'none'
  }

  // UTILITIES
  // ----------------------------------------------------------------------

  function format (logArgs) {
    var parts = []
    for (var i=0; i<logArgs.length; i++) {
      var arg = logArgs[i]
      if (arg instanceof Error) {
        parts.push('\n' + arg.stack)
      } else {
        parts.push(String(arg))
      }
    }
    return parts.join(' ')
  }

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
