/**
 * Basic decoration facilities.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
define(["require", "exports", "module", "jquery", "merge-options", "./dloc", "./domtypeguards", "./domutil", "./gui/action-context-menu", "./util"], function (require, exports, module, $, mergeOptions, dloc_1, domtypeguards_1, domutil, action_context_menu_1, util) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var indexOf = domutil.indexOf;
    var closestByClass = domutil.closestByClass;
    function tryToSetDataCaret(editor, dataCaret) {
        try {
            editor.caretManager.setCaret(dataCaret, { textEdit: true });
        }
        catch (e) {
            // Do nothing.
        }
    }
    function attributeSelectorMatch(selector, name) {
        return selector === "*" || selector === name;
    }
    /**
     * A decorator is responsible for adding decorations to a tree of DOM
     * elements. Decorations are GUI elements.
     */
    var Decorator = (function () {
        /**
         * @param domlistener The listener that the decorator must use to know when
         * the DOM tree has changed and must be redecorated.
         *
         * @param editor The editor instance for which this decorator was created.
         *
         * @param guiUpdater The updater to use to modify the GUI tree. All
         * modifications to the GUI must go through this updater.
         */
        function Decorator(domlistener, editor, guiUpdater) {
            this.domlistener = domlistener;
            this.editor = editor;
            this.guiUpdater = guiUpdater;
        }
        /**
         * Request that the decorator add its event handlers to its listener.
         */
        Decorator.prototype.addHandlers = function () {
            var _this = this;
            this.guiUpdater.events.subscribe(function (ev) {
                if (ev.name !== "BeforeInsertNodeAt" || domtypeguards_1.isText(ev.node)) {
                    return;
                }
                _this.contentEditableHandler(ev);
            });
        };
        /**
         * Start listening to changes to the DOM tree.
         */
        Decorator.prototype.startListening = function () {
            this.domlistener.startListening();
        };
        /**
         * This function adds a separator between each child element of the element
         * passed as ``el``. The function only considers ``._real`` elements.
         *
         * @param el The element to decorate.
         *
         * @param sep A separator.
         */
        Decorator.prototype.listDecorator = function (el, sep) {
            // We expect to work with a homogeneous list. That is, all children the same
            // element.
            var nameMap = Object.create(null);
            var child = el.firstElementChild;
            while (child !== null) {
                if (child.classList.contains("_real")) {
                    nameMap[util.getOriginalName(child)] = 1;
                }
                child = child.nextElementSibling;
            }
            var tags = Object.keys(nameMap);
            if (tags.length > 1) {
                throw new Error("calling listDecorator on a non-homogeneous list.");
            }
            if (tags.length === 0) {
                return;
            } // Nothing to work with
            // First drop all children that are separators
            child = el.firstElementChild;
            while (child !== null) {
                // Grab it before the node is removed.
                var next = child.nextElementSibling;
                if (child.hasAttribute("data-wed--separator-for")) {
                    this.guiUpdater.removeNode(child);
                }
                child = next;
            }
            var tagName = tags[0];
            // If sep is a string, create an appropriate div.
            var sepNode;
            if (typeof sep === "string") {
                sepNode = el.ownerDocument.createElement("div");
                sepNode.textContent = sep;
            }
            else {
                sepNode = sep;
            }
            sepNode.classList.add("_text");
            sepNode.classList.add("_phantom");
            sepNode.setAttribute("data-wed--separator-for", tagName);
            var first = true;
            child = el.firstElementChild;
            while (child !== null) {
                if (child.classList.contains("_real")) {
                    if (!first) {
                        this.guiUpdater.insertBefore(el, sepNode.cloneNode(true), child);
                    }
                    else {
                        first = false;
                    }
                }
                child = child.nextElementSibling;
            }
        };
        /**
         * Generic handler for setting ``contenteditable`` on nodes included into the
         * tree.
         */
        Decorator.prototype.contentEditableHandler = function (ev) {
            var editAttributes = this.editor.attributes === "edit";
            function mod(el) {
                // All elements that may get a selection must be focusable to
                // work around issue:
                // https://bugzilla.mozilla.org/show_bug.cgi?id=921444
                el.setAttribute("tabindex", "-1");
                el.setAttribute("contenteditable", String(el.classList.contains("_real") ||
                    (editAttributes &&
                        el.classList.contains("_attribute_value"))));
                var child = el.firstElementChild;
                while (child !== null) {
                    mod(child);
                    child = child.nextElementSibling;
                }
            }
            // We never call this function with something else than an Element for
            // ev.node.
            mod(ev.node);
        };
        /**
         * Add a start label at the start of an element and an end label at the end.
         *
         * @param root The root of the decorated tree.
         *
         * @param el The element to decorate.
         *
         * @param level The level of the labels for this element.
         *
         * @param preContextHandler An event handler to run when the user invokes a
         * context menu on the start label.
         *
         * @param postContextHandler An event handler to run when the user invokes a
         * context menu on the end label.
         */
        Decorator.prototype.elementDecorator = function (root, el, level, preContextHandler, postContextHandler) {
            if (level > this.editor.max_label_level) {
                throw new Error("level higher than the maximum set by the mode: " + level);
            }
            // Save the caret because the decoration may mess up the GUI caret.
            var dataCaret = this.editor.caretManager.getDataCaret();
            if (dataCaret != null &&
                !(domtypeguards_1.isAttr(dataCaret.node) &&
                    dataCaret.node.ownerElement === $.data(el, "wed_mirror_node"))) {
                dataCaret = undefined;
            }
            var dataNode = $.data(el, "wed_mirror_node");
            this.setReadOnly(el, Boolean(this.editor.validator.getNodeProperty(dataNode, "PossibleDueToWildcard")));
            var origName = util.getOriginalName(el);
            // _[name]_label is used locally to make the function idempotent.
            var cls = "_" + origName + "_label";
            // We must grab a list of nodes to remove before we start removing them
            // because an element that has a placeholder in it is going to lose the
            // placeholder while we are modifying it. This could throw off the scan.
            var toRemove = domutil.childrenByClass(el, cls);
            for (var _i = 0, toRemove_1 = toRemove; _i < toRemove_1.length; _i++) {
                var remove = toRemove_1[_i];
                el.removeChild(remove);
            }
            var attributesHTML = [];
            var hiddenAttributes = false;
            if (this.editor.attributes === "show" ||
                this.editor.attributes === "edit") {
                // include the attributes
                var attributes = util.getOriginalAttributes(el);
                var names = Object.keys(attributes).sort();
                for (var _a = 0, names_1 = names; _a < names_1.length; _a++) {
                    var name_1 = names_1[_a];
                    var hideAttribute = this.mustHideAttribute(el, name_1);
                    if (hideAttribute) {
                        hiddenAttributes = true;
                    }
                    var extra = hideAttribute ? " _shown_when_caret_in_label" : "";
                    attributesHTML.push([
                        "<span class=\"_phantom _attribute" + extra + "\">",
                        "<span class=\"_phantom _attribute_name\">", name_1,
                        "</span>=\"<span class=\"_phantom _attribute_value\">",
                        domutil.textToHTML(attributes[name_1]),
                        "</span>\"</span>",
                    ].join(""));
                }
            }
            var attributesStr = (attributesHTML.length !== 0 ? " " : "") +
                attributesHTML.join(" ");
            var doc = el.ownerDocument;
            cls += " _label_level_" + level;
            // Save the cls of the end label here so that we don't further modify it.
            var endCls = cls;
            if (hiddenAttributes) {
                cls += " _autohidden_attributes";
            }
            var pre = doc.createElement("span");
            pre.className = "_gui _phantom __start_label _start_wrapper " + cls + " _label";
            var prePh = doc.createElement("span");
            prePh.className = "_phantom";
            // tslint:disable-next-line:no-inner-html
            prePh.innerHTML = "&nbsp;<span class='_phantom _element_name'>" + origName + "</span>" + attributesStr + "<span class='_phantom _greater_than'> >&nbsp;</span>";
            pre.appendChild(prePh);
            this.guiUpdater.insertNodeAt(el, 0, pre);
            var post = doc.createElement("span");
            post.className = "_gui _phantom __end_label _end_wrapper " + endCls + " _label";
            var postPh = doc.createElement("span");
            postPh.className = "_phantom";
            // tslint:disable-next-line:no-inner-html
            postPh.innerHTML = "<span class='_phantom _less_than'>&nbsp;&lt; </span><span class='_phantom _element_name'>" + origName + "</span>&nbsp;";
            post.appendChild(postPh);
            this.guiUpdater.insertBefore(el, post, null);
            // Setup a handler so that clicking one label highlights it and
            // the other label.
            $(pre).on("wed-context-menu", preContextHandler !== undefined ? preContextHandler : false);
            $(post).on("wed-context-menu", postContextHandler !== undefined ? postContextHandler : false);
            if (dataCaret != null) {
                tryToSetDataCaret(this.editor, dataCaret);
            }
        };
        /**
         * Determine whether an attribute must be hidden. The default implementation
         * calls upon the ``attributes.autohide`` section of the "wed options" that
         * were used by the mode in effect to determine whether an attribute should be
         * hidden or not.
         *
         * @param el The element in the GUI tree that we want to test.
         *
         * @param name The attribute name in "prefix:localName" format where "prefix"
         * is to be understood according to the absolute mapping defined by the mode.
         *
         * @returns ``true`` if the attribute must be hidden. ``false`` otherwise.
         */
        Decorator.prototype.mustHideAttribute = function (el, name) {
            var specs = this.attributeHidingSpecs;
            if (specs === null) {
                return false;
            }
            for (var _i = 0, _a = specs.elements; _i < _a.length; _i++) {
                var element = _a[_i];
                if (el.matches(element.selector)) {
                    var matches = false;
                    for (var _b = 0, _c = element.attributes; _b < _c.length; _b++) {
                        var attribute = _c[_b];
                        if (typeof attribute === "string") {
                            // If we already matched, there's no need to try to match with
                            // another selector.
                            if (!matches) {
                                matches = attributeSelectorMatch(attribute, name);
                            }
                        }
                        else {
                            // If we do not match yet, there's no need to try to exclude the
                            // attribute.
                            if (matches) {
                                for (var _d = 0, _e = attribute.except; _d < _e.length; _d++) {
                                    var exception = _e[_d];
                                    matches = !attributeSelectorMatch(exception, name);
                                    // As soon as we stop matching, there's no need to continue
                                    // checking other exceptions.
                                    if (!matches) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    // An element selector that matches is terminal.
                    return matches;
                }
            }
            return false;
        };
        Object.defineProperty(Decorator.prototype, "attributeHidingSpecs", {
            get: function () {
                if (this._attributeHidingSpecs === undefined) {
                    var attributeHiding = this.editor.attributeHiding;
                    if (attributeHiding === undefined) {
                        // No attribute hiding...
                        this._attributeHidingSpecs = null;
                    }
                    else {
                        var method = attributeHiding.method;
                        if (method !== "selector") {
                            throw new Error("unknown attribute hiding method: " + method);
                        }
                        var specs = {
                            elements: [],
                        };
                        for (var _i = 0, _a = attributeHiding.elements; _i < _a.length; _i++) {
                            var element = _a[_i];
                            var copy = mergeOptions({}, element);
                            copy.selector = domutil.toGUISelector(copy.selector);
                            specs.elements.push(copy);
                        }
                        this._attributeHidingSpecs = specs;
                    }
                }
                return this._attributeHidingSpecs;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Add or remove the CSS class ``_readonly`` on the basis of the 2nd argument.
         *
         * @param el The element to modify. Must be in the GUI tree.
         *
         * @param readonly Whether the element is readonly or not.
         */
        Decorator.prototype.setReadOnly = function (el, readonly) {
            var cl = el.classList;
            (readonly ? cl.add : cl.remove).call(cl, "_readonly");
        };
        /**
         * Context menu handler for the labels of elements decorated by
         * [[Decorator.elementDecorator]].
         *
         * @param atStart Whether or not this event is for the start label.
         *
         * @param wedEv The DOM event that wed generated to trigger this handler.
         *
         * @param ev The DOM event that wed received.
         *
         * @returns To be interpreted the same way as for all DOM event handlers.
         */
        // tslint:disable-next-line:max-func-body-length
        Decorator.prototype.contextMenuHandler = function (atStart, wedEv, ev) {
            var editor = this.editor;
            var node = wedEv.target;
            var menuItems = [];
            var mode = editor.mode;
            var doc = node.ownerDocument;
            var atStartToTxt = {
                undefined: "",
                true: " before this element",
                false: " after this element",
            };
            function pushItem(data, tr, start) {
                var li = editor._makeMenuItemForAction(tr, data);
                var a = li.getElementsByTagName("a")[0];
                var text = doc.createTextNode(atStartToTxt[String(start)]);
                a.appendChild(text);
                a.normalize();
                menuItems.push({ action: tr, item: li, data: data });
            }
            function pushItems(data, trs, start) {
                if (trs === undefined) {
                    return;
                }
                for (var _i = 0, trs_1 = trs; _i < trs_1.length; _i++) {
                    var tr = trs_1[_i];
                    pushItem(data, tr, start);
                }
            }
            function processAttributeNameEvent(event, element) {
                var namePattern = event.params[1];
                // The next if line causes tslint to inexplicably raise a failure. I am
                // able to reproduce it with something as small as:
                //
                // import { Name } from "salve";
                //
                // export function func(p: Name): void {
                //   if (p.simple()) {
                //     document.body.textContent = "1";
                //   }
                // }
                //
                // tslint:disable-next-line:strict-boolean-expressions
                if (namePattern.simple()) {
                    for (var _i = 0, _a = namePattern.toArray(); _i < _a.length; _i++) {
                        var name_2 = _a[_i];
                        var unresolved = editor.resolver.unresolveName(name_2.ns, name_2.name);
                        if (unresolved === undefined) {
                            throw new Error("cannot unresolve attribute");
                        }
                        if (editor.isAttrProtected(unresolved, element)) {
                            return;
                        }
                        pushItems({ name: unresolved, node: element }, mode.getContextualActions("add-attribute", unresolved, element));
                    }
                }
                else {
                    pushItem(undefined, editor.complex_pattern_action);
                }
            }
            var real = closestByClass(node, "_real", editor.gui_root);
            var readonly = real !== null && real.classList.contains("_readonly");
            var attrVal = closestByClass(node, "_attribute_value", editor.gui_root);
            if (attrVal !== null) {
                var dataNode = editor.toDataNode(attrVal);
                var treeCaret_1 = dloc_1.DLoc.mustMakeDLoc(editor.data_root, dataNode.ownerElement);
                editor.validator.possibleAt(treeCaret_1, true).forEach(function (event) {
                    if (event.params[0] !== "attributeName") {
                        return;
                    }
                    var toAddTo = treeCaret_1.node.childNodes[treeCaret_1.offset];
                    processAttributeNameEvent(event, toAddTo);
                });
                var name_3 = dataNode.name;
                if (!editor.isAttrProtected(dataNode)) {
                    pushItems({ name: name_3, node: dataNode }, mode.getContextualActions("delete-attribute", name_3, dataNode));
                }
            }
            else {
                // We want the first real parent.
                var candidate = closestByClass(node, "_real", editor.gui_root);
                if (candidate === null) {
                    throw new Error("cannot find real parent");
                }
                node = candidate;
                var topNode = (node.parentNode === editor.gui_root);
                // We first gather the transformations that pertain to the node to which
                // the label belongs.
                var orig = util.getOriginalName(node);
                var docURL = mode.documentationLinkFor(orig);
                if (docURL != null) {
                    var li = doc.createElement("li");
                    li.appendChild(this.editor.makeDocumentationLink(docURL));
                    menuItems.push({ action: null, item: li, data: null });
                }
                if (!topNode) {
                    pushItems({ node: node, name: orig }, mode.getContextualActions(["unwrap", "delete-element"], orig, $.data(node, "wed_mirror_node"), 0));
                }
                // Then we check what could be done before the node (if the
                // user clicked on an start element label) or after the node
                // (if the user clicked on an end element label).
                var parent_1 = node.parentNode;
                var index = indexOf(parent_1.childNodes, node);
                // If we're on the end label, we want the events *after* the node.
                if (!atStart) {
                    index++;
                }
                var treeCaret_2 = editor.caretManager.toDataLocation(parent_1, index);
                if (treeCaret_2 === undefined) {
                    throw new Error("cannot get caret");
                }
                if (atStart && editor.attributes === "edit") {
                    editor.validator.possibleAt(treeCaret_2, true).forEach(function (event) {
                        if (event.params[0] !== "attributeName") {
                            return;
                        }
                        var toAddTo = treeCaret_2.node.childNodes[treeCaret_2.offset];
                        processAttributeNameEvent(event, toAddTo);
                    });
                }
                if (!topNode) {
                    for (var _i = 0, _a = editor.getElementTransformationsAt(treeCaret_2, "insert"); _i < _a.length; _i++) {
                        var tr = _a[_i];
                        if (tr.name !== undefined) {
                            // Regular case: we have a real transformation.
                            pushItem({ name: tr.name, moveCaretTo: treeCaret_2 }, tr.tr, atStart);
                        }
                        else {
                            // It is an action rather than a transformation.
                            pushItem(undefined, tr.tr);
                        }
                    }
                    if (atStart) {
                        // Move to inside the element and get the get the wrap-content
                        // possibilities.
                        var caretInside = treeCaret_2.make(treeCaret_2.node.childNodes[treeCaret_2.offset], 0);
                        for (var _b = 0, _c = editor.getElementTransformationsAt(caretInside, "wrap-content"); _b < _c.length; _b++) {
                            var tr = _c[_b];
                            pushItem(tr.name !== undefined ? { name: tr.name, node: node }
                                : undefined, tr.tr);
                        }
                    }
                }
            }
            // There's no menu to display, so let the event bubble up.
            if (menuItems.length === 0) {
                return true;
            }
            var pos = editor.computeContextMenuPosition(ev);
            editor.displayContextMenu(action_context_menu_1.ContextMenu, pos.left, pos.top, menuItems, readonly);
            return false;
        };
        return Decorator;
    }());
    exports.Decorator = Decorator;
});
//  LocalWords:  sep el focusable lt enterStartTag unclick nbsp li
//  LocalWords:  tabindex listDecorator contenteditable href jQuery
//  LocalWords:  gui domlistener domutil util validator jquery
//  LocalWords:  Mangalam MPL Dubeau

//# sourceMappingURL=decorator.js.map
