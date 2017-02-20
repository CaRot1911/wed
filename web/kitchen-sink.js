/**
 * @module kitchen-sink
 * @desc A demo module for wed
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
define(function f(require) {
  "use strict";

  var wed = require("wed/wed");
  var runtime = require("wed/runtime");
  var modeMap = require("wed/mode-map").modes;
  var metaMap = require("wed/meta-map").metas;
  var store = require("dashboard/store");
  var $ = require("jquery");
  var URI = require("urijs/URI");
  var lr = require("last-resort");
  var onerror = require("wed/onerror");
  var globalConfig = require("global-config");
  var mergeOptions = require("merge-options");
  var Promise = require("bluebird");

  // This installs last-resort on our current window and registers with it
  // wed's error handler.
  var onError = lr.install(window);
  onError.register(onerror.handler);

  var uri = new URI();
  var query = uri.query(true);
  var mode = query.mode;
  var file = query.file;
  var schema = query.schema;
  var localstorage = query.localstorage;
  var options_param = query.options;
  var nodemo = query.nodemo;

  if (file !== undefined && localstorage !== undefined) {
    throw new Error("file and localstorage defined: use one or " +
                    "the other");
  }

  function makeURL(table, id) {
    var url = "indexeddb://v1/" + store.db.name + "/" + table.name +
        "/number/" + id;
    return url;
  }

  Promise.try(function initial() {
    if (localstorage) {
      // Show the link...
      var file_management_link = document.getElementById("fm-link");
      file_management_link.style.display = "";

      return new Promise(function makePromise(resolve, reject) {
        require(["wed-store"], resolve, reject);
      }).then(function loaded(wedStore) {
        var saverOptions = {
          save: {
            path: "wed/savers/indexeddb",
            options: {
              getStore: function getStore() {
                return wedStore;
              },
              name: localstorage,
            },
          },
        };

        if (!localstorage.indexOf("://") === -1) {
          return wedStore.get(localstorage).then(function then(value) {
            return [value.data, undefined, saverOptions];
          });
        }

        return [undefined, localstorage, saverOptions];
      });
    }

    return [undefined, file];
  }).spread(function launch(text, filePath, options) {
    options = options || {};
    if (text && filePath) {
      throw new Error("text and file cannot be both defined");
    }

    if (mode) {
      options.mode = { path: mode };
    }

    if (schema) {
      switch (schema) {
      case "@math":
        options.schema = "/build/schemas/tei-math-rng.js";
        options.mode = {
          path: "wed/modes/generic/generic",
          options: {
            meta: {
              path: "wed/modes/generic/metas/tei_meta",
              options: {
                metadata:
                "/build/schemas/tei-math-metadata.json",
              },
            },
          },
        };
        break;
      case "@docbook":
        options.schema = "/build/schemas/docbook.js";
        options.mode = {
          path: "wed/modes/generic/generic",
          options: {
            meta: {
              path: "wed/modes/generic/metas/docbook_meta",
              options: undefined,
            },
          },
        };
        break;
      default:
        options.schema = schema;
      }
    }

    if (options_param === "noautoinsert") {
      options.mode.options = { autoinsert: false };
    }

    if (options_param === "ambiguous_fileDesc_insert") {
      options.mode.options = { ambiguous_fileDesc_insert: true };
    }

    if (options_param === "fileDesc_insert_needs_input") {
      options.mode.options = { fileDesc_insert_needs_input: true };
    }

    if (options_param === "hide_attributes") {
      options.mode.options = { hide_attributes: true };
    }

    // We don't want a demo dialog to show up in testing.
    if (!nodemo) {
      if (!localstorage) {
        options.demo =
          "You will not be able to save your modifications.";
      }
      else {
        options.demo =
          "Your modifications will be saved in local storage.";
      }
    }

    var r = new runtime.Runtime(options);

    var deps = [];
    if (filePath) {
      deps.push(filePath);
    }

    Promise.all(deps.map(r.resolve.bind(r)))
      .then(function resolved(resolvedDeps) {
        if (deps.length === 0) {
          return undefined;
        }

        var resolvedFile = resolvedDeps[0];
        if (!resolvedFile) {
          throw new Error("did not resolve file! " + deps[0]);
        }

        if (typeof resolvedFile === "string") {
          text = resolvedFile;
          return undefined;
        }

        // This is a file from the indexeddb system. Resolve the pack.
        text = resolvedFile.data;

        // At this stage options.save.options.name contains a bogus value. Put
        // the file name there.
        options.save.options.name = resolvedFile.name;

        var packURL = makeURL(store.db.packs, resolvedFile.pack);
        return r.resolve(packURL).then(function packResolved(pack) {
          var schemaURL = makeURL(store.db.schemas, pack.schema) + "/data";
          var metadataURL = makeURL(store.db.metadata, pack.metadata) + "/data";
          options.schema = schemaURL;
          options.mode = {
            path: modeMap[pack.mode],
            options: {
              meta: {
                path: metaMap[pack.meta],
                options: {
                  metadata: metadataURL,
                },
              },
            },
          };
        });
      })
      .then(function start() {
        $(function ready() {
          var widget = document.getElementById("widget");
          window.wed_editor = new wed.Editor();
          var finalOptions = mergeOptions({}, globalConfig.config, options);
          window.wed_editor.init(widget, finalOptions, text);
        });
      });
  });
});