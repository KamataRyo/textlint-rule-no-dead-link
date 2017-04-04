'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

/**
 * Checks if a given URI is alive or not.
 * @param {string} uri
 * @param {string} method
 * @return {{ ok: boolean, redirect?: string, message: string }}
 */
let isAlive = (() => {
  var _ref = _asyncToGenerator(function* (uri, method = 'HEAD') {
    try {
      const opts = {
        method,
        // Disable gzip compression in Node.js
        // to avoid the zlib's "unexpected end of file" error
        // https://github.com/request/request/issues/2045
        compress: false,
        // manual redirect
        redirect: 'manual'
      };
      const res = yield (0, _isomorphicFetch2.default)(uri, opts);

      if (res.status === 301) {
        const finalRes = yield (0, _isomorphicFetch2.default)(uri, {
          method: 'HEAD',
          compress: false
        });
        return {
          ok: finalRes.ok,
          redirect: finalRes.url,
          message: `${res.status} ${res.statusText}`
        };
      }
      return {
        ok: res.ok,
        message: `${res.status} ${res.statusText}`
      };
    } catch (err) {
      return {
        ok: false,
        message: err.message
      };
    }
  });

  return function isAlive(_x) {
    return _ref.apply(this, arguments);
  };
})();

var _textlintRuleHelper = require('textlint-rule-helper');

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DEFAULT_OPTIONS = {
  checkRelative: false, // should check relative URLs.
  baseURI: null, // a base URI to resolve a relative URL.
  ignore: [] };

// http://stackoverflow.com/a/3809435/951517
// eslint-disable-next-line max-len
const URI_REGEXP = /(https?:)?\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;

/**
 * Returns `true` if a given URI is relative.
 * @param {string} uri
 * @return {Boolean}
 */
function isRelative(uri) {
  return _url2.default.parse(uri).protocol === null;
}

function reporter(context, options = {}) {
  const Syntax = context.Syntax,
        getSource = context.getSource,
        report = context.report,
        RuleError = context.RuleError,
        fixer = context.fixer;

  const helper = new _textlintRuleHelper.RuleHelper(context);
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);

  /**
   * Checks a given URI's availability and report if it is dead.
   * @param {TextLintNode} node TextLintNode the URI belongs to.
   * @param {string} uri a URI string to be linted.
   * @param {number} index column number the URI is located at.
   */
  const lint = (() => {
    var _ref2 = _asyncToGenerator(function* ({ node, uri, index }) {
      if (opts.ignore.indexOf(uri) !== -1) {
        return;
      }

      if (isRelative(uri)) {
        if (!opts.checkRelative) {
          return;
        }

        if (!opts.baseURI) {
          const message = 'The base URI is not specified.';
          report(node, new RuleError(message, { index: 0 }));
          return;
        }

        // eslint-disable-next-line no-param-reassign
        uri = _url2.default.resolve(opts.baseURI, uri);
      }

      const result = yield isAlive(uri);

      var _ref3 = result.ok ? result : yield isAlive(uri, 'GET');

      const ok = _ref3.ok,
            redirect = _ref3.redirect,
            msg = _ref3.message;


      if (!ok) {
        const message = `${uri} is dead. (${msg})`;
        report(node, new RuleError(message, { index }));
      } else if (redirect) {
        const message = `${uri} is redirected. (${msg})`;
        const fix = fixer.replaceTextRange([index, index + uri.length], redirect);
        report(node, new RuleError(message, {
          fix,
          index
        }));
      }
    });

    return function lint(_x2) {
      return _ref2.apply(this, arguments);
    };
  })();

  /**
   * URIs to be checked.
   * @type {Array<{ node: TextLintNode, uri: string, index: number }>}
   */
  const URIs = [];

  return {
    [Syntax.Str](node) {
      if (helper.isChildNode(node, [Syntax.BlockQuote])) {
        return;
      }

      // prevent double checks
      if (helper.isChildNode(node, [Syntax.Link])) {
        return;
      }

      const text = getSource(node);
      let matched;

      // eslint-disable-next-line no-cond-assign
      while (matched = URI_REGEXP.exec(text)) {
        const uri = matched[0];
        const index = matched.index;
        URIs.push({ node, uri, index });
      }
    },

    [Syntax.Link](node) {
      if (helper.isChildNode(node, [Syntax.BlockQuote])) {
        return;
      }
      // [text](http://example.com)
      //       ^
      const index = node.raw.indexOf(node.url) || 0;
      URIs.push({
        node,
        uri: node.url,
        index
      });
    },

    [`${context.Syntax.Document}:exit`]() {
      return Promise.all(URIs.map(item => lint(item)));
    }
  };
}

exports.default = {
  linter: reporter,
  fixer: reporter
};
//# sourceMappingURL=no-dead-link.js.map