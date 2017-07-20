define(["require", "exports", "module", "salve", "wed/domtypeguards", "wed/domutil", "wed/transformation"], function (require, exports, module, salve, domtypeguards_1, domutil_1, transformation_1) {
    /**
     * Transformation registry for the generic mode.
     * @author Louis-Dominique Dubeau
     * @license MPL 2.0
     * @copyright Mangalam Research Center for Buddhist Languages
     */
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function errFilter(err) {
        var errMsg = err.error.toString();
        return errMsg.lastIndexOf("tag required: ", 0) === 0;
    }
    /**
     * Perform the autoinsertion algorithm on an element.
     *
     * @param el The element that should be subject to the autoinsertion algorithm.
     *
     * @param editor The editor which owns the element.
     */
    function _autoinsert(el, editor) {
        // tslint:disable-next-line:no-constant-condition strict-boolean-expressions
        while (true) {
            var errors = editor.validator.getErrorsFor(el);
            errors = errors.filter(errFilter);
            if (errors.length === 0) {
                break;
            }
            var ename = errors[0].error.getNames()[0];
            var names = ename.toArray();
            // If names is null the pattern is not simple and we cannot autoinsert. If
            // there is more than one option, we also cannot autoinsert.
            if (names === null || names.length > 1) {
                break;
            }
            var name_1 = names[0];
            var locations = editor.validator.possibleWhere(el, new salve.Event("enterStartTag", name_1.ns, name_1.name));
            if (locations.length !== 1) {
                break;
            }
            var unresolved = editor.resolver.unresolveName(name_1.ns, name_1.name);
            var actions = editor.mode.getContextualActions("insert", unresolved, el, locations[0]);
            // Don't auto insert if it happens that the operation would be ambiguous
            // (ie. if there is more than one way to insert the element).
            if (actions.length !== 1) {
                break;
            }
            // Don't auto insert if the operation needs input from the user.
            if (actions[0].needsInput) {
                break;
            }
            //
            // We move the caret ourselves rather than using moveCaretTo. In this
            // context, it does not matter because autoinsert is meant to be called by a
            // transformation anyway.
            //
            editor.caretManager.setCaret(el, locations[0]);
            actions[0].execute({ name: unresolved });
        }
    }
    function executeInsert(editor, data) {
        var caret = editor.caretManager.getDataCaret();
        var absoluteResolver = editor.mode.getAbsoluteResolver();
        var ename = absoluteResolver.resolveName(data.name);
        if (ename === undefined) {
            throw new Error("cannot resolve " + data.name);
        }
        var unresolved = editor.validator.unresolveNameAt(caret.node, caret.offset, ename.ns, ename.name);
        var el = transformation_1.insertElement(editor.data_updater, caret.node, caret.offset, ename.ns, data.name);
        if (unresolved === undefined) {
            // The namespace used by the element has not been defined yet. So we need to
            // define it.
            var prefix = absoluteResolver.prefixFromURI(ename.ns);
            var name_2 = (prefix === "") ? "xmlns" : "xmlns:" + prefix;
            // The next name is necessarily resolvable so we assert that it is not
            // resolving to undefined.
            var xmlnsURI = absoluteResolver.resolveName("xmlns:q").ns;
            editor.data_updater.setAttributeNS(el, xmlnsURI, name_2, ename.ns);
        }
        var caretNode = el;
        if (editor.mode.getModeOptions().autoinsert) {
            _autoinsert(el, editor);
            // Set el to the deepest first child, so that the caret is put in the right
            // position.
            while (caretNode !== null) {
                var child = caretNode.firstChild;
                if (child === null) {
                    break;
                }
                caretNode = child;
            }
        }
        editor.caretManager.setCaret(caretNode, 0);
    }
    function executeUnwrap(editor, data) {
        var node = data.node;
        if (!domtypeguards_1.isElement(node)) {
            throw new Error("node must be an element");
        }
        var parent = node.parentNode;
        var index = domutil_1.indexOf(parent.childNodes, node);
        transformation_1.unwrap(editor.data_updater, node);
        editor.caretManager.setCaret(parent, index);
    }
    function executeWrap(editor, data) {
        var sel = editor.caretManager.sel;
        if (sel == null) {
            throw new Error("wrap transformation called with undefined range");
        }
        if (sel.collapsed) {
            throw new Error("wrap transformation called with collapsed range");
        }
        var _a = sel.asDataCarets(), startCaret = _a[0], endCaret = _a[1];
        var ename = editor.mode.getAbsoluteResolver().resolveName(data.name);
        if (ename === undefined) {
            throw new Error("cannot resolve " + data.name);
        }
        var el = transformation_1.wrapInElement(editor.data_updater, startCaret.node, startCaret.offset, endCaret.node, endCaret.offset, ename.ns, data.name);
        var parent = el.parentNode;
        editor.caretManager.setCaret(startCaret.make(parent, domutil_1.indexOf(parent.childNodes, el) + 1));
    }
    function executeWrapContent(editor, data) {
        var toWrap = data.node;
        if (!domtypeguards_1.isElement(toWrap)) {
            throw new Error("node must be an element");
        }
        var ename = editor.mode.getAbsoluteResolver().resolveName(data.name);
        if (ename === undefined) {
            throw new Error("cannot resolve " + data.name);
        }
        transformation_1.wrapInElement(editor.data_updater, toWrap, 0, toWrap, toWrap.childNodes.length, ename.ns, data.name);
    }
    function executeDeleteElement(editor, data) {
        var node = data.node;
        if (!domtypeguards_1.isElement(node)) {
            throw new Error("node must be an element");
        }
        var parent = node.parentNode;
        var index = domutil_1.indexOf(parent.childNodes, node);
        var guiLoc = editor.caretManager.fromDataLocation(node, 0);
        // If the node we start with is an Element, then the node in guiLoc is
        // necessarily an Element too.
        if (!guiLoc.node.classList.contains("_readonly")) {
            editor.data_updater.removeNode(node);
            editor.caretManager.setCaret(parent, index);
        }
    }
    function executeDeleteParent(editor, data) {
        var node = data.node;
        if (!domtypeguards_1.isElement(node)) {
            throw new Error("node must be an element");
        }
        var parent = node.parentNode;
        var index = domutil_1.indexOf(parent.childNodes, node);
        var guiLoc = editor.caretManager.fromDataLocation(node, 0);
        // If the node we start with is an Element, then the node in guiLoc is
        // necessarily an Element too.
        if (!guiLoc.node.classList.contains("_readonly")) {
            editor.data_updater.removeNode(node);
            editor.caretManager.setCaret(parent, index);
        }
    }
    function executeAddAttribute(editor, data) {
        var node = data.node;
        if (!domtypeguards_1.isElement(node)) {
            throw new Error("node must be an element");
        }
        var guiLoc = editor.caretManager.fromDataLocation(node, 0);
        // If the node we start with is an Element, then the node in guiLoc is
        // necessarily an Element too.
        if (!guiLoc.node.classList.contains("_readonly")) {
            editor.data_updater.setAttribute(node, data.name, "");
            var attr = node.getAttributeNode(data.name);
            editor.caretManager.setCaret(attr, 0);
        }
    }
    function executeDeleteAttribute(editor, data) {
        var node = data.node;
        if (node == null || !domtypeguards_1.isAttr(node)) {
            throw new Error("node must be an attribute");
        }
        var element = node.ownerElement;
        var caretManager = editor.caretManager;
        var guiOwnerLoc = caretManager.fromDataLocation(element, 0);
        // If the node we start with is an Element, then the node in guiOwnerLoc
        // is necessarily an Element too.
        var guiOwner = guiOwnerLoc.node;
        if (!guiOwner.classList.contains("_readonly")) {
            var encoded = node.name;
            var startLabel = domutil_1.childByClass(guiOwner, "__start_label");
            // An earlier version of this code relied on the order of attributres in the
            // data tree. However, this order is not consistent from platform to
            // platform. Using the order of attributes in the GUI is
            // consistent. Therefore we go to the GUI to find the next attribute.
            var values = startLabel.getElementsByClassName("_attribute_value");
            // We have to get the parent node because fromDataLocation brings us to the
            // text node that contains the value.
            var guiNode = caretManager.fromDataLocation(node, 0).node.parentNode;
            var index = domutil_1.indexOf(values, guiNode);
            var nextGUIValue = values[index + 1];
            var nextAttr = nextGUIValue != null ?
                editor.toDataNode(nextGUIValue) : null;
            editor.data_updater.setAttribute(element, encoded, null);
            // We set the caret inside the next attribute, or if it does not exist,
            // inside the label.
            if (nextAttr !== null) {
                editor.caretManager.setCaret(nextAttr, 0);
            }
            else {
                editor.caretManager.setCaret(guiOwnerLoc.node.getElementsByClassName("_element_name")[0], 0);
            }
        }
    }
    /**
     * @param forEditor The editor for which to create transformations.
     */
    function makeTagTr(forEditor) {
        var ret = Object.create(null);
        ret.insert = new transformation_1.Transformation(forEditor, "insert", "Create new <name>", "", executeInsert);
        ret.unwrap = new transformation_1.Transformation(forEditor, "unwrap", "Unwrap the content of this element", undefined, executeUnwrap);
        ret.wrap = new transformation_1.Transformation(forEditor, "wrap", "Wrap in <name>", undefined, executeWrap);
        ret["wrap-content"] = new transformation_1.Transformation(forEditor, "wrap-content", "Wrap content in <name>", undefined, executeWrapContent);
        ret["delete-element"] = new transformation_1.Transformation(forEditor, "delete-element", "Delete this element", undefined, executeDeleteElement);
        ret["delete-parent"] = new transformation_1.Transformation(forEditor, "delete-parent", "Delete <name>", undefined, executeDeleteParent);
        ret["add-attribute"] = new transformation_1.Transformation(forEditor, "add-attribute", "Add @<name>", undefined, executeAddAttribute);
        ret["delete-attribute"] = new transformation_1.Transformation(forEditor, "delete-attribute", "Delete this attribute", undefined, executeDeleteAttribute);
        ret["insert-text"] = new transformation_1.Transformation(forEditor, "insert-text", "Insert \"<name>\"", undefined, function (editor, data) {
            editor.type(data.name);
        });
        ret.split = forEditor.split_node_tr;
        return ret;
    }
    exports.makeTagTr = makeTagTr;
});
//  LocalWords:  TransformationRegistry Mangalam MPL Dubeau

//# sourceMappingURL=generic-tr.js.map
